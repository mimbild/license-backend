import { Router } from "express";
import { z } from "zod";

import {
  activateLicenseController,
  getLicenseController,
  listMyLicensesController,
  releaseDeviceController,
  validateLicenseController,
} from "../controllers/license.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";

const licenseRouter = Router();

const activationSchema = z
  .object({
    licenseKey: z.string().min(8),
    deviceFingerprint: z.string().min(1).optional(),
    machineId: z.string().min(1).optional(),
    deviceName: z.string().min(1).max(120).optional(),
  })
  .refine((value) => value.deviceFingerprint || value.machineId, {
    message: "deviceFingerprint or machineId is required",
  });

const validationSchema = z
  .object({
    licenseKey: z.string().min(8),
    deviceFingerprint: z.string().min(1).optional(),
    machineId: z.string().min(1).optional(),
  })
  .refine((value) => value.deviceFingerprint || value.machineId, {
    message: "deviceFingerprint or machineId is required",
  });

const releaseSchema = z
  .object({
    licenseKey: z.string().min(8),
    deviceFingerprint: z.string().min(1).optional(),
    machineId: z.string().min(1).optional(),
  })
  .refine((value) => value.deviceFingerprint || value.machineId, {
    message: "deviceFingerprint or machineId is required",
  });

licenseRouter.post(
  "/activate",
  validateBody(activationSchema),
  asyncHandler(activateLicenseController),
);
licenseRouter.post(
  "/validate",
  validateBody(validationSchema),
  asyncHandler(validateLicenseController),
);
licenseRouter.post(
  "/release-device",
  requireAuth,
  validateBody(releaseSchema),
  asyncHandler(releaseDeviceController),
);
licenseRouter.get(
  "/:licenseKey",
  validateParams(z.object({ licenseKey: z.string().min(8) })),
  asyncHandler(getLicenseController),
);

export { licenseRouter };
