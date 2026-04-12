import { Router } from "express";
import { z } from "zod";

import {
  completePasswordSetupController,
  loginController,
  registerController,
  requestPasswordSetupController,
} from "../controllers/auth.controller";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";

const authRouter = Router();

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
authRouter.post("/login", validateBody(loginSchema), asyncHandler(loginController));
authRouter.post(
  "/request-password-setup",
  validateBody(requestPasswordSetupSchema),
  asyncHandler(requestPasswordSetupController),
);
authRouter.post(
  "/complete-password-setup",
  validateBody(completePasswordSetupSchema),
  asyncHandler(completePasswordSetupController),
);

export { authRouter };
