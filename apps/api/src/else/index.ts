import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import initializeUserExtension from "./controllers/initialize-user-extension";
import startUserWorkspace from "./controllers/start-user-workspace";
import getWorkspaceStatus from "./controllers/get-workspace-status";

export * from "./service";

const elseRoutes = new Hono()
  .post(
    "/user/extension/initialize",
    describeRoute({
      summary: "Initialize user extension",
      description:
        "Creates a tenant and extension for the current user in Else",
      responses: {
        200: {
          description: "Extension initialized",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  tenantId: z.string(),
                  extensionId: z.string(),
                  alreadyExists: z.boolean(),
                }),
              ),
            },
          },
        },
      },
    }),
    initializeUserExtension,
  )
  .post(
    "/user/workspace/start",
    describeRoute({
      summary: "Start user workspace",
      description: "Starts the Else workspace for the current user's extension",
      responses: {
        200: {
          description: "Workspace start initiated",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  success: z.boolean(),
                }),
              ),
            },
          },
        },
      },
    }),
    startUserWorkspace,
  )
  .get(
    "/user/workspace/status",
    describeRoute({
      summary: "Get workspace status",
      description:
        "Gets the current status of the user's workspace including URL when ready",
      responses: {
        200: {
          description: "Workspace status",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  isInitialized: z.boolean(),
                  isRunning: z.boolean(),
                  workspaceUrl: z.string().nullable(),
                  status: z.string().optional(),
                  extensionName: z.string().optional(),
                }),
              ),
            },
          },
        },
      },
    }),
    getWorkspaceStatus,
  );

export default elseRoutes;
