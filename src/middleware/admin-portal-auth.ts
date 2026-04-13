import type { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../utils/jwt";

const ADMIN_COOKIE_NAME = "scanctrl_admin_token";

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

function readAdminToken(req: Request) {
  const rawCookie = req.headers.cookie;

  if (!rawCookie) {
    return null;
  }

  const entries = rawCookie.split(";").map((item) => item.trim());

  for (const entry of entries) {
    if (!entry.startsWith(`${ADMIN_COOKIE_NAME}=`)) {
      continue;
    }

    return decodeURIComponent(entry.slice(`${ADMIN_COOKIE_NAME}=`.length));
  }

  return null;
}

export function optionalAdminAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readAdminToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAuthToken(token);

    if (payload.role !== "ADMIN") {
      req.auth = undefined;
      next();
      return;
    }

    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    req.auth = undefined;
  }

  next();
}

export function requireAdminPortalAuth(req: Request, res: Response, next: NextFunction) {
  optionalAdminAuth(req, res, () => {
    if (!req.auth || req.auth.role !== "ADMIN") {
      res.redirect("/admin/login");
      return;
    }

    next();
  });
}
