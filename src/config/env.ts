import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8),
  APP_BASE_URL: z.string().url(),
  MAIL_FROM: z.string().email(),
  MAIL_MODE: z.enum(["console", "smtp", "resend"]).default("console"),
  RESEND_API_KEY: z.string().optional().default(""),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  SQUARESPACE_WEBHOOK_SECRET: z.string().optional().default(""),
  SQUARESPACE_API_KEY: z.string().optional().default(""),
  SQUARESPACE_API_BASE_URL: z.string().url().default("https://api.squarespace.com"),
  SQUARESPACE_USER_AGENT: z.string().default("ScanCTRL License Backend"),
  SQUARESPACE_SYNC_ENABLED: z.enum(["true", "false"]).default("false"),
  SQUARESPACE_SYNC_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),
  SQUARESPACE_SYNC_LIMIT: z.coerce.number().int().min(1).max(100).default(20),
  TRIAL_DAYS: z.coerce.number().int().positive().default(5),
  GRACE_DAYS: z.coerce.number().int().positive().default(7),
});

export const env = envSchema.parse(process.env);
