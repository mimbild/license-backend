import type { Request, Response } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { getAdminCookieName } from "../middleware/admin-portal-auth";
import {
  getAdminDashboardUserById,
  getAdminDashboardUserByEmail,
  listAdminDashboardUsers,
  releaseDeviceByAdmin,
} from "../services/admin.service";
import { loginUser, issuePasswordSetupForUser } from "../services/auth.service";
import { syncSquarespaceOrders } from "../services/squarespace-sync.service";
import { renderAdminDashboardPage, renderAdminLoginPage } from "../views/admin-page";

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const adminSyncSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminReleaseSchema = z.object({
  deviceFingerprint: z.string().min(1),
});

export async function adminLoginPageController(req: Request, res: Response) {
  if (req.auth?.role === "ADMIN") {
    res.redirect("/admin/dashboard");
    return;
  }

  res.status(200).type("html").send(
    renderAdminLoginPage({
      notice:
        typeof req.query.notice === "string" && req.query.notice === "signed-out"
          ? "You have been signed out."
          : undefined,
    }),
  );
}

export async function adminLoginSubmitController(req: Request, res: Response) {
  if (req.auth?.role === "ADMIN") {
    res.redirect("/admin/dashboard");
    return;
  }

  const parsed = adminLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).type("html").send(
      renderAdminLoginPage({
        email: typeof req.body?.email === "string" ? req.body.email : "",
        errorMessage: "Please enter a valid email and password.",
      }),
    );
    return;
  }

  try {
    const result = await loginUser(parsed.data);

    if (result.user.role !== "ADMIN") {
      throw new Error("not_admin");
    }

    res.cookie(getAdminCookieName(), result.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.redirect("/admin/dashboard");
  } catch {
    res.status(401).type("html").send(
      renderAdminLoginPage({
        email: parsed.data.email,
        errorMessage: "We could not sign you in with that admin account.",
      }),
    );
  }
}

export async function adminLogoutController(_req: Request, res: Response) {
  res.clearCookie(getAdminCookieName(), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.redirect("/admin/login?notice=signed-out");
}

export async function adminDashboardController(req: Request, res: Response) {
  const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
  const selectedUserId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  const notice = typeof req.query.notice === "string" ? req.query.notice : undefined;
  const syncMessage = typeof req.query.sync === "string" ? req.query.sync : undefined;

  const users = await listAdminDashboardUsers({
    limit: 50,
    email: email || undefined,
  });

  const result = selectedUserId
    ? await getAdminDashboardUserById(selectedUserId)
    : email && users.length === 1
      ? await getAdminDashboardUserByEmail(users[0].email)
      : undefined;

  res.status(200).type("html").send(
    renderAdminDashboardPage({
      adminEmail: req.auth!.email,
      searchEmail: email || undefined,
      users,
      selectedUserId: result?.user.id,
      result,
      notice,
      syncMessage,
    }),
  );
}

export async function adminSendPasswordSetupController(req: Request, res: Response) {
  await issuePasswordSetupForUser(String(req.params.userId));
  res.redirect("/admin/dashboard?notice=Password+setup+email+sent");
}

export async function adminReleaseDeviceController(req: Request, res: Response) {
  const parsed = adminReleaseSchema.safeParse(req.body);

  if (!parsed.success) {
    res.redirect("/admin/dashboard?notice=Missing+device+fingerprint");
    return;
  }

  await releaseDeviceByAdmin({
    licenseKey: String(req.params.licenseKey),
    deviceFingerprint: parsed.data.deviceFingerprint,
  });

  res.redirect("/admin/dashboard?notice=Device+released");
}

export async function adminSyncSquarespaceController(req: Request, res: Response) {
  const parsed = adminSyncSchema.safeParse(req.body);
  const result = await syncSquarespaceOrders({
    limit: parsed.success ? parsed.data.limit : 20,
  });

  res.redirect(
    `/admin/dashboard?sync=${encodeURIComponent(
      `Squarespace sync complete. Fetched ${result.fetched} and processed ${result.processedCount}.`,
    )}`,
  );
}
