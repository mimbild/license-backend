import type { Request, Response } from "express";

import {
  activateLicense,
  getLicenseByKey,
  listUserLicenses,
  releaseDevice,
  validateLicense,
} from "../services/license.service";

export async function activateLicenseController(req: Request, res: Response) {
  const result = await activateLicense(req.body);
  res.status(result.ok ? 200 : 409).json(result);
}

export async function validateLicenseController(req: Request, res: Response) {
  const result = await validateLicense(req.body);
  res.status(200).json(result);
}

export async function releaseDeviceController(req: Request, res: Response) {
  const result = await releaseDevice({
    ...req.body,
    userId: req.auth!.userId,
  });
  res.status(200).json(result);
}

export async function getLicenseController(req: Request, res: Response) {
  const result = await getLicenseByKey(String(req.params.licenseKey));
  res.status(200).json(result);
}

export async function listMyLicensesController(req: Request, res: Response) {
  const result = await listUserLicenses(req.auth!.userId);
  res.status(200).json(result);
}
