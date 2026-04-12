import type { Request, Response } from "express";

import {
  completePasswordSetup,
  loginUser,
  registerUser,
  requestPasswordSetup,
} from "../services/auth.service";

export async function registerController(req: Request, res: Response) {
  const result = await registerUser(req.body);
  res.status(201).json(result);
}

export async function loginController(req: Request, res: Response) {
  const result = await loginUser(req.body);
  res.status(200).json(result);
}

export async function requestPasswordSetupController(req: Request, res: Response) {
  const result = await requestPasswordSetup(req.body);
  res.status(200).json(result);
}

export async function completePasswordSetupController(req: Request, res: Response) {
  const result = await completePasswordSetup(req.body);
  res.status(200).json(result);
}
