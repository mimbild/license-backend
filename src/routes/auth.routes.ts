import { Router } from "express";
import { z } from "zod";

import {
  completePasswordSetupController,
  loginController,
  registerController,
  requestPasswordSetupController,
} from "../controllers/auth.controller";
import { env } from "../config/env";
import { createRateLimit } from "../middleware/rate-limit";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";

const authRouter = Router();
const authWindowMs = env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;

const loginRateLimit = createRateLimit({
  windowMs: authWindowMs,
  maxRequests: env.AUTH_LOGIN_MAX_ATTEMPTS,
  keyPrefix: "auth-login",
  code: "LOGIN_RATE_LIMITED",
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
});

const requestPasswordSetupRateLimit = createRateLimit({
  windowMs: authWindowMs,
  maxRequests: env.PASSWORD_SETUP_REQUEST_MAX_ATTEMPTS,
  keyPrefix: "password-setup-request",
  code: "PASSWORD_SETUP_REQUEST_RATE_LIMITED",
  message: "Too many password setup requests. Please wait a few minutes and try again.",
});

const completePasswordSetupRateLimit = createRateLimit({
  windowMs: authWindowMs,
  maxRequests: env.PASSWORD_SETUP_COMPLETE_MAX_ATTEMPTS,
  keyPrefix: "password-setup-complete",
  code: "PASSWORD_SETUP_COMPLETE_RATE_LIMITED",
  message: "Too many password setup attempts. Please wait a few minutes and try again.",
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const requestPasswordSetupSchema = z.object({
  email: z.string().email(),
});

const completePasswordSetupSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

authRouter.post("/register", validateBody(registerSchema), asyncHandler(registerController));
authRouter.post("/login", loginRateLimit, validateBody(loginSchema), asyncHandler(loginController));
authRouter.post(
  "/request-password-setup",
  requestPasswordSetupRateLimit,
  validateBody(requestPasswordSetupSchema),
  asyncHandler(requestPasswordSetupController),
);
authRouter.post(
  "/complete-password-setup",
  completePasswordSetupRateLimit,
  validateBody(completePasswordSetupSchema),
  asyncHandler(completePasswordSetupController),
);

export { authRouter };
