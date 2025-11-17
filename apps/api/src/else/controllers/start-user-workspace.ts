import type { Context } from "hono";
import db from "../../database";
import { userTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import { startWorkspace } from "../service";

/**
 * Start a user's Else workspace
 */
export default async function startUserWorkspace(c: Context) {
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
      return c.json(
        { error: "Extension not initialized. Call /initialize first" },
        400,
      );
    }

    // Start the workspace
    await startWorkspace(user.elseTenantId, user.elseExtensionId);

    return c.json({ success: true });
  } catch (error) {
    console.error("[Start Workspace] Error:", error);
    return c.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start workspace",
      },
      500,
    );
  }
}

