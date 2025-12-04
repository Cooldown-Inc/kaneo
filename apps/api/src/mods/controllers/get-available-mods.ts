import type { Context } from "hono";
import db from "../../database";
import { workspaceTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import { listPublishedExtensions } from "../../else/service";

async function getAvailableMods(c: Context) {
  // Hard-coded mods
  const mods = [
    {
      id: "new-layout",
      title: "New Layout",
    },
    {
      id: "personal-space",
      title: "My Space",
    },
  ];

  // Try to fetch published extensions for the active workspace's tenant
  try {
    const session = c.get("session");
    const activeWorkspaceId = session?.activeOrganizationId;

    if (activeWorkspaceId) {
      // Get workspace's tenant ID
      const [workspace] = await db
        .select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, activeWorkspaceId))
        .limit(1);

      if (workspace?.elseTenantId) {
        // Fetch published extensions for this tenant
        const publishedExtensions = await listPublishedExtensions(workspace.elseTenantId);
        
        // Add published extension if any exist (max 1)
        if (publishedExtensions.length > 0) {
          const firstPublished = publishedExtensions[0];
          mods.push({
            id: firstPublished.id,
            title: "Your Prototype",
          });
        }
      }
    }
  } catch (error) {
    // Silently handle errors - just return hard-coded mods
    console.error("[Get Available Mods] Error fetching published extensions:", error);
  }

  return c.json(mods);
}

export default getAvailableMods;

