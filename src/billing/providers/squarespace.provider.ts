import { mapSquarespacePayload } from "../../integrations/squarespace/mapping";
import { env } from "../../config/env";
import { ApiError } from "../../utils/api-error";
import { verifySquarespaceSignature } from "../../utils/webhook-signature";
import type { BillingProviderAdapter, BillingWebhookInput } from "../types";

export class SquarespaceBillingProvider implements BillingProviderAdapter {
  readonly provider = "SQUARESPACE" as const;

  async parseWebhook(input: BillingWebhookInput) {
    if (env.SQUARESPACE_WEBHOOK_SECRET && input.signature) {
      const isValid = verifySquarespaceSignature(
        input.payload,
        input.signature,
        env.SQUARESPACE_WEBHOOK_SECRET,
      );

      if (!isValid) {
        throw new ApiError(401, "INVALID_SIGNATURE", "Invalid Squarespace signature");
      }
    }

    return mapSquarespacePayload(input.payload);
  }
}

