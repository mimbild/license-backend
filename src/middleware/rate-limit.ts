import type { NextFunction, Request, Response } from "express";

import { ApiError } from "../utils/api-error";

type LimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  code?: string;
  message: string;
  onLimit?: (req: Request, res: Response) => void;
};

const buckets = new Map<string, LimitEntry>();

function getClientIdentifier(req: Request) {
  const forwarded = req.ip || req.socket.remoteAddress || "unknown";
  return forwarded.trim().toLowerCase();
}

function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function createRateLimit(options: RateLimitOptions) {
  const code = options.code ?? "RATE_LIMITED";

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const bucketKey = `${options.keyPrefix}:${getClientIdentifier(req)}`;
    const existing = buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count <= options.maxRequests) {
      next();
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfterSeconds));

    if (options.onLimit) {
      options.onLimit(req, res);
      return;
    }

    next(
      new ApiError(429, code, options.message, {
        retryAfterSeconds,
      }),
    );
  };
}
