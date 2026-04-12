import { env } from "../config/env";
import { parseSquarespaceOrdersPage, mapSquarespaceOrderToBillingEvent } from "../integrations/squarespace/orders-sync";
import { ApiError } from "../utils/api-error";
import { processNormalizedBillingEvent } from "./webhook.service";

export async function syncSquarespaceOrders(input: {
  limit: number;
}) {
  if (!env.SQUARESPACE_API_KEY) {
    throw new ApiError(
      400,
      "SQUARESPACE_API_KEY_MISSING",
      "Set SQUARESPACE_API_KEY in .env to use Squarespace order sync",
    );
  }

  const url = new URL("/1.0/commerce/orders", env.SQUARESPACE_API_BASE_URL);
  url.searchParams.set("limit", String(input.limit));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.SQUARESPACE_API_KEY}`,
      "User-Agent": env.SQUARESPACE_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      "SQUARESPACE_SYNC_FAILED",
      `Squarespace orders sync failed: ${errorText}`,
    );
  }

  const page = parseSquarespaceOrdersPage(await response.json());
  const processed = [];

  for (const order of page.result) {
    if (!order.customerEmail || order.lineItems.length === 0) {
      continue;
    }

    const mapped = mapSquarespaceOrderToBillingEvent(order);
    const result = await processNormalizedBillingEvent("SQUARESPACE", mapped);
    processed.push({
      orderId: order.id,
      customerEmail: order.customerEmail,
      result,
    });
  }

  return {
    ok: true,
    fetched: page.result.length,
    processedCount: processed.length,
    processed,
  };
}
