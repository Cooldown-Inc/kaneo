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

export interface TenantResponse {
  id: string;
  external_id: string;
  name: string;
  slug: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtensionResponse {
  id: string;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
}

export interface ExtensionInfo {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  is_running: boolean;
  dev_env_url?: string | null;
  is_published?: boolean;
}

export interface ListExtensionsResponse {
  extensions: ExtensionInfo[];
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

/**
 * Create a tenant for a user
 */
export async function createTenant(
  externalId: string,
  name: string,
  metadata?: Record<string, any>,
): Promise<TenantResponse> {
  if (!ELSE_API_KEY) {
    throw new Error("ELSE_API_KEY is not configured");
  }

  const url = `${ELSE_API_BASE_URL}/products/${ELSE_PRODUCT_SLUG}/tenants`;

  console.log("[Else API] Creating tenant:", { externalId, name, metadata });

  const requestBody: {
    external_id: string;
    name: string;
    metadata?: Record<string, any>;
  } = {
    external_id: externalId,
    name: name,
  };

  if (metadata) {
    requestBody.metadata = metadata;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ELSE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Else API] Error creating tenant:", errorText);
    throw new Error(
      `Failed to create tenant: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  console.log("[Else API] Tenant created:", data);
  return data;
}

/**
 * Get a tenant by external ID
 */
export async function getTenant(externalId: string): Promise<TenantResponse> {
  if (!ELSE_API_KEY) {
    throw new Error("ELSE_API_KEY is not configured");
  }

  const url = `${ELSE_API_BASE_URL}/products/${ELSE_PRODUCT_SLUG}/tenants/${externalId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ELSE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get tenant: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * Create an extension for a tenant
 */
export async function createExtension(
  tenantExternalId: string,
): Promise<ExtensionResponse> {
  if (!ELSE_API_KEY) {
    throw new Error("ELSE_API_KEY is not configured");
  }

  const url = `${ELSE_API_BASE_URL}/products/${ELSE_PRODUCT_SLUG}/tenants/${tenantExternalId}/extensions`;

  console.log("[Else API] Creating extension for tenant:", tenantExternalId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ELSE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      visibility_type: "tenant_members",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Else API] Error creating extension:", errorText);
    throw new Error(
      `Failed to create extension: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  console.log("[Else API] Extension created:", data);
  return data;
}

/**
 * Start a workspace for an extension
 */
export async function startWorkspace(
  tenantExternalId: string,
  extensionId: string,
): Promise<void> {
  if (!ELSE_API_KEY) {
    throw new Error("ELSE_API_KEY is not configured");
  }

  const url = `${ELSE_API_BASE_URL}/products/${ELSE_PRODUCT_SLUG}/tenants/${tenantExternalId}/extensions/${extensionId}/workspace/start`;

  console.log("[Else API] Starting workspace:", {
    tenantExternalId,
    extensionId,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ELSE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok && response.status !== 202) {
    const errorText = await response.text();
    console.error("[Else API] Error starting workspace:", errorText);
    throw new Error(
      `Failed to start workspace: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  console.log("[Else API] Workspace start request submitted");
}

/**
 * List extensions for a tenant and check workspace status
 */
export async function listExtensions(
  tenantExternalId: string,
): Promise<ListExtensionsResponse> {
  if (!ELSE_API_KEY) {
    throw new Error("ELSE_API_KEY is not configured");
  }

  const url = `${ELSE_API_BASE_URL}/products/${ELSE_PRODUCT_SLUG}/tenants/${tenantExternalId}/extensions`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ELSE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to list extensions: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return await response.json();
}

/**
 * List published extensions for a tenant
 */
export async function listPublishedExtensions(
  tenantExternalId: string,
): Promise<ExtensionInfo[]> {
  try {
    console.log("[Else API] Fetching published extensions for tenant:", tenantExternalId);
    
    // Use the existing listExtensions endpoint
    const response = await listExtensions(tenantExternalId);
    
    // Filter for only published extensions
    const publishedExtensions = (response.extensions || []).filter(
      (ext) => ext.is_published === true
    );
    
    console.log("[Else API] Published extensions:", publishedExtensions);
    
    return publishedExtensions;
  } catch (error) {
    console.error("[Else API] Error fetching published extensions:", error);
    // Return empty array on error to fail gracefully
    return [];
  }
}

