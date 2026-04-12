import { ApiError } from "../../utils/api-error";
import type { BillingProviderAdapter, BillingWebhookInput } from "../types";

export class AppleAppStoreBillingProvider implements BillingProviderAdapter {
  readonly provider = "APPLE_APP_STORE" as const;

  async parseWebhook(_input: BillingWebhookInput) {
    return Promise.reject(
      new ApiError(
        501,
        "APPLE_NOT_READY",
        "Apple App Store integration is scaffolded but not implemented yet",
      ),
    );
  }
}
