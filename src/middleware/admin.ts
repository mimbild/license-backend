import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/api-error";

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== "ADMIN") {
    next(new ApiError(403, "FORBIDDEN", "Admin access required"));
    return;
  }

  next();
}

