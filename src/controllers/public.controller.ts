import type { Request, Response } from "express";
import { z } from "zod";

import { completePasswordSetup, getPasswordSetupTokenStatus } from "../services/auth.service";
import { renderSetupPasswordPage } from "../views/setup-password-page";

const tokenQuerySchema = z.object({
  token: z.string().min(16),
});

const setupPasswordFormSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  name: z.string().trim().optional().default(""),
});

export async function setupPasswordFormController(req: Request, res: Response) {
  const parsedQuery = tokenQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    res
      .status(400)
      .type("html")
      .send(
        renderSetupPasswordPage({
          state: "invalid",
          appBaseUrl: req.protocol + "://" + req.get("host"),
          errorMessage: "This password setup link is missing or invalid.",
        }),
      );
    return;
  }

  const result = await getPasswordSetupTokenStatus(parsedQuery.data.token);

  if (!result.valid) {
    res
      .status(400)
      .type("html")
      .send(
        renderSetupPasswordPage({
          state: "invalid",
          appBaseUrl: req.protocol + "://" + req.get("host"),
          errorMessage: "This password setup link is invalid or has expired.",
        }),
      );
    return;
  }

  res.status(200).type("html").send(
    renderSetupPasswordPage({
      state: "form",
      token: parsedQuery.data.token,
      email: result.email,
      name: result.name ?? "",
      expiresAt: result.expiresAt.toISOString(),
      appBaseUrl: req.protocol + "://" + req.get("host"),
    }),
  );
}

export async function submitSetupPasswordFormController(req: Request, res: Response) {
  const parsedBody = setupPasswordFormSchema.safeParse(req.body);

  if (!parsedBody.success) {
    const rawToken = typeof req.body?.token === "string" ? req.body.token : "";
    const status = rawToken ? await getPasswordSetupTokenStatus(rawToken) : { valid: false as const };

    res
      .status(400)
      .type("html")
      .send(
        renderSetupPasswordPage({
          state: status.valid ? "form" : "invalid",
          token: rawToken,
          email: status.valid ? status.email : "",
          name: typeof req.body?.name === "string" ? req.body.name : "",
          expiresAt: status.valid ? status.expiresAt.toISOString() : undefined,
          appBaseUrl: req.protocol + "://" + req.get("host"),
          errorMessage: "Please check the form and try again.",
        }),
      );
    return;
  }

  const { token, password, confirmPassword, name } = parsedBody.data;

  if (password !== confirmPassword) {
    const status = await getPasswordSetupTokenStatus(token);

    res
      .status(400)
      .type("html")
      .send(
        renderSetupPasswordPage({
          state: status.valid ? "form" : "invalid",
          token,
          email: status.valid ? status.email : "",
          name,
          expiresAt: status.valid ? status.expiresAt.toISOString() : undefined,
          appBaseUrl: req.protocol + "://" + req.get("host"),
          errorMessage: "Passwords do not match.",
        }),
      );
    return;
  }

  try {
    const result = await completePasswordSetup({
      token,
      password,
      name: name || undefined,
    });

    res.status(200).type("html").send(
      renderSetupPasswordPage({
        state: "success",
        email: result.user.email,
        name: result.user.name ?? "",
        appBaseUrl: req.protocol + "://" + req.get("host"),
      }),
    );
  } catch (_error) {
    res
      .status(400)
      .type("html")
      .send(
        renderSetupPasswordPage({
          state: "invalid",
          appBaseUrl: req.protocol + "://" + req.get("host"),
          errorMessage: "This password setup link is invalid or has expired.",
        }),
      );
  }
}
