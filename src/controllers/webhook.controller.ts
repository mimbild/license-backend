import type { Request, Response } from "express";

import { processSquarespaceWebhook } from "../services/webhook.service";

export async function squarespaceWebhookController(req: Request, res: Response) {
  const result = await processSquarespaceWebhook({
    payload: req.body,
    signature: req.header("x-squarespace-signature") ?? undefined,
  });

  res.status(202).json(result);
}

