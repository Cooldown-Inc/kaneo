import { config } from "dotenv-mono";

// Only load .env files in development (Heroku provides env vars directly)
if (process.env.NODE_ENV !== "production") {
  config();
}

const ELSE_API_BASE_URL =
  process.env.ELSE_API_BASE_URL || "http://localhost:8001/vendor-api";
const ELSE_API_KEY = process.env.ELSE_API_KEY || "";
const ELSE_PRODUCT_SLUG = "kaneo";

export interface BundleResponse {
  bundle_url: string | null;
  deployment_id: string | null;
  status: string;
  tenant_id: string;
}

/**
 * Fetch the bundle URL for an extension by its identifier (mod ID)
 */
export async function getExtensionBundle(
  extensionIdentifier: string,
): Promise<BundleResponse> {
  if (!ELSE_API_KEY) {
    throw new Error("ELSE_API_KEY is not configured");
  }

  const url = `${ELSE_API_BASE_URL}/products/${ELSE_PRODUCT_SLUG}/extensions/${extensionIdentifier}/bundle`;

  console.log("[Else API] Making request:", {
    url,
    method: "GET",
    baseUrl: ELSE_API_BASE_URL,
    productSlug: ELSE_PRODUCT_SLUG,
    extensionIdentifier,
    hasApiKey: !!ELSE_API_KEY,
    apiKeyPrefix: ELSE_API_KEY.substring(0, 10) + "...",
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ELSE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  console.log("[Else API] Response:", {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Else API] Error response body:", errorText);
    throw new Error(
      `Failed to fetch bundle from Else API: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  console.log("[Else API] Success:", { bundleUrl: data.bundle_url });
  return data;
}

