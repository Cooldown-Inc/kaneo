ALTER TABLE "workspace" ADD COLUMN "else_tenant_id" text;--> statement-breakpoint
ALTER TABLE "workspace" ADD COLUMN "else_extension_id" text;--> statement-breakpoint

-- Migrate data from user to workspace
-- For each workspace, copy the elseTenantId and elseExtensionId from the first member who has them
UPDATE "workspace" w
SET 
  "else_tenant_id" = u."else_tenant_id",
  "else_extension_id" = u."else_extension_id"
FROM (
  SELECT DISTINCT ON (wm."workspace_id")
    wm."workspace_id",
    u."else_tenant_id",
    u."else_extension_id"
  FROM "workspace_member" wm
  INNER JOIN "user" u ON wm."user_id" = u."id"
  WHERE u."else_tenant_id" IS NOT NULL
  ORDER BY wm."workspace_id", wm."joined_at" ASC
) u
WHERE w."id" = u."workspace_id";