import type { Context } from "hono";
import db from "../../database";
import { userTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import { createTenant, createExtension } from "../service";

/**
 * Initialize a user's Else extension (create tenant and extension)
 */
export default async function initializeUserExtension(c: Context) {
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

    // Check if user already has a tenant and extension
    if (user.elseTenantId && user.elseExtensionId) {
      return c.json({
        tenantId: user.elseTenantId,
        extensionId: user.elseExtensionId,
        alreadyExists: true,
      });
    }

    // Create tenant if not exists
    let tenantId = user.elseTenantId;
    if (!tenantId) {
      const tenant = await createTenant(userId, user.name || user.email);
      tenantId = tenant.external_id;
    }

    // Create extension
    const extension = await createExtension(tenantId);

    // Update user with tenant and extension IDs
    await db
      .update(userTable)
      .set({
        elseTenantId: tenantId,
        elseExtensionId: extension.id,
      })
      .where(eq(userTable.id, userId));

    return c.json({
      tenantId,
      extensionId: extension.id,
      alreadyExists: false,
    });
  } catch (error) {
    console.error("[Initialize Extension] Error:", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to initialize extension",
      },
      500,
    );
  }
}

