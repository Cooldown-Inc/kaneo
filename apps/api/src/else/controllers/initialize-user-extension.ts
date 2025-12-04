import type { Context } from "hono";
import db from "../../database";
import { userTable, workspaceTable } from "../../database/schema";
import { eq } from "drizzle-orm";
import { createTenant, createExtension } from "../service";

/**
 * Initialize workspace's Else extension (create tenant and extension)
 * Falls back to user-level tenant for backward compatibility
 */
export default async function initializeUserExtension(c: Context) {
  try {
    const session = c.get("session");
    const userId = session?.userId;
    const activeWorkspaceId = session?.activeOrganizationId;

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

    // If we have an active workspace, use workspace-level tenant
    if (activeWorkspaceId) {
      const [workspace] = await db
        .select()
        .from(workspaceTable)
        .where(eq(workspaceTable.id, activeWorkspaceId))
        .limit(1);

      if (workspace) {
        // Check if workspace already has a tenant and extension
        if (workspace.elseTenantId && workspace.elseExtensionId) {
          return c.json({
            tenantId: workspace.elseTenantId,
            extensionId: workspace.elseExtensionId,
            alreadyExists: true,
          });
        }

        // Check if user has tenant (migration case)
        let tenantId = workspace.elseTenantId || user.elseTenantId;
        
        if (!tenantId) {
          // Create new tenant for workspace
          const tenant = await createTenant(
            activeWorkspaceId,
            workspace.name,
            { analytics_id: user.email, workspace_id: activeWorkspaceId },
          );
          tenantId = tenant.external_id;
        }

        // Create extension if doesn't exist
        let extensionId = workspace.elseExtensionId;
        if (!extensionId) {
          const extension = await createExtension(tenantId);
          extensionId = extension.id;
        }

        // Update workspace with tenant and extension IDs
        await db
          .update(workspaceTable)
          .set({
            elseTenantId: tenantId,
            elseExtensionId: extensionId,
          })
          .where(eq(workspaceTable.id, activeWorkspaceId));

        return c.json({
          tenantId,
          extensionId,
          alreadyExists: false,
        });
      }
    }

    // Fallback: user-level tenant (backward compatibility)
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
      const tenant = await createTenant(
        userId,
        user.name || user.email,
        { analytics_id: user.email },
      );
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

