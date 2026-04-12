import type { NextFunction, Request, Response } from "express";

import { verifyAuthToken } from "../utils/jwt";

const PORTAL_COOKIE_NAME = "scanctrl_portal_token";

export function getPortalCookieName() {
  return PORTAL_COOKIE_NAME;
}

export function readPortalToken(req: Request) {
  const rawCookie = req.headers.cookie;

  if (!rawCookie) {
    return null;
  }

  const entries = rawCookie.split(";").map((item) => item.trim());

  for (const entry of entries) {
    if (!entry.startsWith(`${PORTAL_COOKIE_NAME}=`)) {
      continue;
    }

    return decodeURIComponent(entry.slice(`${PORTAL_COOKIE_NAME}=`.length));
  }

  return null;
}

export function optionalPortalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readPortalToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAuthToken(token);
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

export function requirePortalAuth(req: Request, res: Response, next: NextFunction) {
  optionalPortalAuth(req, res, () => {
    if (!req.auth) {
      res.redirect("/portal/login");
      return;
    }

    next();
  });
}
