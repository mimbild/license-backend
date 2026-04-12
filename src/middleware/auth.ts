import type { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../utils/jwt";
import { ApiError } from "../utils/api-error";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next(new ApiError(401, "UNAUTHORIZED", "Missing bearer token"));
    return;
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(new ApiError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}

