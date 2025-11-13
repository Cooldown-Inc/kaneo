import type { Context } from "hono";
import { getExtensionBundle } from "../../else/service";

async function getModBundle(c: Context) {
  const modId = c.req.param("modId");

  if (!modId) {
    return c.json({ error: "Mod ID is required" }, 400);
  }

  try {
    const bundleResponse = await getExtensionBundle(modId);
    return c.json({ bundleUrl: bundleResponse.bundle_url });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to fetch bundle for mod ${modId}:`, error);
    return c.json({ error: errorMessage }, 500);
  }
}

export default getModBundle;

