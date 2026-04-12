import type { BillingProvider } from "@prisma/client";

import { AppleAppStoreBillingProvider } from "./providers/apple-app-store.provider";
import { GooglePlayBillingProvider } from "./providers/google-play.provider";
import { SquarespaceBillingProvider } from "./providers/squarespace.provider";
import type { BillingProviderAdapter } from "./types";

const providers: Map<BillingProvider, BillingProviderAdapter> = new Map();

providers.set("SQUARESPACE", new SquarespaceBillingProvider());
providers.set("APPLE_APP_STORE", new AppleAppStoreBillingProvider());
providers.set("GOOGLE_PLAY", new GooglePlayBillingProvider());

export function getBillingProviderAdapter(provider: BillingProvider) {
  const adapter = providers.get(provider);

  if (!adapter) {
    throw new Error(`No billing provider registered for ${provider}`);
  }

  return adapter;
}
