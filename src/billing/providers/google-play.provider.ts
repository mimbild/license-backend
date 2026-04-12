import { ApiError } from "../../utils/api-error";
import type { BillingProviderAdapter, BillingWebhookInput } from "../types";

export class GooglePlayBillingProvider implements BillingProviderAdapter {
  readonly provider = "GOOGLE_PLAY" as const;

  async parseWebhook(_input: BillingWebhookInput) {
    return Promise.reject(
      new ApiError(
        501,
        "GOOGLE_PLAY_NOT_READY",
        "Google Play integration is scaffolded but not implemented yet",
      ),
    );
  }
}
