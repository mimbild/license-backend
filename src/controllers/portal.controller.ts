import type { Request, Response } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { getPortalCookieName } from "../middleware/portal-auth";
import { loginUser } from "../services/auth.service";
import { listUserLicenses, releaseDevice } from "../services/license.service";
import { renderPortalAccountPage, renderPortalLoginPage } from "../views/portal-page";

const portalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const portalReleaseSchema = z.object({
  deviceFingerprint: z.string().min(1),
});

export async function portalLoginPageController(req: Request, res: Response) {
  if (req.auth) {
    res.redirect("/portal/account");
    return;
  }

  const notice =
    typeof req.query.notice === "string" && req.query.notice === "password-set"
      ? "Password saved. You can sign in now."
      : undefined;

  res.status(200).type("html").send(
    renderPortalLoginPage({
      appBaseUrl: env.APP_BASE_URL,
      notice,
    }),
  );
}

export async function portalLoginSubmitController(req: Request, res: Response) {
  if (req.auth) {
    res.redirect("/portal/account");
    return;
  }

  const parsed = portalLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).type("html").send(
      renderPortalLoginPage({
        appBaseUrl: env.APP_BASE_URL,
        email: typeof req.body?.email === "string" ? req.body.email : "",
        errorMessage: "Please enter a valid email and password.",
      }),
    );
    return;
  }

  try {
    const result = await loginUser(parsed.data);

    res.cookie(getPortalCookieName(), result.token, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.redirect("/portal/account");
  } catch {
    res.status(401).type("html").send(
      renderPortalLoginPage({
        appBaseUrl: env.APP_BASE_URL,
        email: parsed.data.email,
        errorMessage: "We could not sign you in with that email and password.",
      }),
    );
  }
}

export async function portalLogoutController(_req: Request, res: Response) {
  res.clearCookie(getPortalCookieName(), {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.redirect("/portal/login");
}

export async function portalAccountController(req: Request, res: Response) {
  const licenses = await listUserLicenses(req.auth!.userId);
  const releaseMessage =
    typeof req.query.released === "string" && req.query.released === "1"
      ? "Device released successfully."
      : undefined;

  res.status(200).type("html").send(
    renderPortalAccountPage({
      appBaseUrl: env.APP_BASE_URL,
      email: req.auth!.email,
      role: req.auth!.role,
      licenses,
      releaseMessage,
    }),
  );
}

export async function portalReleaseDeviceController(req: Request, res: Response) {
  const parsed = portalReleaseSchema.safeParse(req.body);

  if (!parsed.success) {
    res.redirect("/portal/account");
    return;
  }

  await releaseDevice({
    licenseKey: String(req.params.licenseKey),
    userId: req.auth!.userId,
    deviceFingerprint: parsed.data.deviceFingerprint,
  });

  res.redirect("/portal/account?released=1");
}
