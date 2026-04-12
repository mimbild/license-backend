import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../config/env";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
