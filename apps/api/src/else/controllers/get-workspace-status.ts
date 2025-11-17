import type { Context } from "hono";
import db from "../../database";
import { userTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import { listExtensions } from "../service";

/**
 * Get the status of a user's workspace
 */
export default async function getWorkspaceStatus(c: Context) {
  try {
    const session = c.get("session");
    const userId = session?.userId;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    if (!user.elseTenantId || !user.elseExtensionId) {
      return c.json({
        isInitialized: false,
        isRunning: false,
        workspaceUrl: null,
      });
    }

    // Get extension status
    const extensionsData = await listExtensions(user.elseTenantId);
    const userExtension = extensionsData.extensions.find(
      (ext) => ext.id === user.elseExtensionId,
    );

    if (!userExtension) {
      return c.json({
        isInitialized: true,
        isRunning: false,
        workspaceUrl: null,
        status: "not_found",
      });
    }

    return c.json({
      isInitialized: true,
      isRunning: userExtension.is_running,
      workspaceUrl: userExtension.dev_env_url,
      status: userExtension.status,
      extensionName: userExtension.name,
    });
  } catch (error) {
    console.error("[Get Workspace Status] Error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get workspace status",
      },
      500,
    );
  }
}

