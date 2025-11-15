import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { subscribeToEvent } from "../events";
import createGithubIntegration from "./controllers/create-github-integration";
import deleteGithubIntegration from "./controllers/delete-github-integration";
import getGithubIntegration from "./controllers/get-github-integration";
import { importIssues } from "./controllers/import-issues";
import listUserRepositories from "./controllers/list-user-repositories";
import verifyGithubInstallation from "./controllers/verify-github-installation";
import createGithubApp from "./utils/create-github-app";
import { handleIssueClosed } from "./utils/issue-closed";
import { handleIssueOpened } from "./utils/issue-opened";
import { handleTaskCreated } from "./utils/task-created";
import { handleTaskPriorityChanged } from "./utils/task-priority-changed";
import { handleTaskStatusChanged } from "./utils/task-status-changed";

const githubApp = createGithubApp();

if (githubApp) {
  githubApp.webhooks.on("issues.opened", handleIssueOpened);
  githubApp.webhooks.on("issues.closed", handleIssueClosed);
}

subscribeToEvent<{
  taskId: string;
  userId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  number: number;
  projectId: string;
}>("task.created", handleTaskCreated);

subscribeToEvent<{
  taskId: string;
  userId: string | null;
  oldStatus: string;
  newStatus: string;
  title: string;
}>("task.status_changed", handleTaskStatusChanged);

subscribeToEvent<{
  taskId: string;
  userId: string | null;
  oldPriority: string;
  newPriority: string;
  title: string;
}>("task.priority_changed", handleTaskPriorityChanged);

const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  fullName: z.string(),
  owner: z.string(),
});

const githubIntegrationSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  repositoryOwner: z.string(),
  repositoryName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const githubIntegration = new Hono()
  .get(
    "/app-info",
    describeRoute({
      summary: "Get GitHub app info",
      description: "Get GitHub app name if configured",
      responses: {
        200: {
          description: "App info",
          content: {
            "application/json": {
              schema: resolver(z.object({ appName: z.string().nullable() })),
            },
          },
        },
      },
    }),
    async (c) => {
      return c.json({
        appName: process.env.GITHUB_APP_NAME || null,
      });
    },
  )
  .get(
    "/repositories",
    describeRoute({
      summary: "List user repositories",
      description: "Get list of repositories accessible to the user",
      responses: {
        200: {
          description: "List of repositories",
          content: {
            "application/json": {
              schema: resolver(z.array(repositorySchema)),
            },
          },
        },
      },
    }),
    async (c) => {
      const repositories = await listUserRepositories();
      return c.json(repositories);
    },
  )
  .post(
    "/verify",
    describeRoute({
      summary: "Verify GitHub installation",
      description: "Verify GitHub app installation for a repository",
      responses: {
        200: {
          description: "Verification result",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  installed: z.boolean(),
                  message: z.string().optional(),
                }),
              ),
            },
          },
        },
      },
    }),
    zValidator(
      "json",
      z.object({
        repositoryOwner: z.string().min(1),
        repositoryName: z.string().min(1),
      }),
    ),
    async (c) => {
      const { repositoryOwner, repositoryName } = c.req.valid("json");
      const verification = await verifyGithubInstallation({
        repositoryOwner,
        repositoryName,
      });
      return c.json(verification);
    },
  )
  .get(
    "/project/:projectId",
    describeRoute({
      summary: "Get GitHub integration",
      description: "Get GitHub integration for a project",
      responses: {
        200: {
          description: "GitHub integration",
          content: {
            "application/json": {
              schema: resolver(githubIntegrationSchema.nullable()),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const integration = await getGithubIntegration(projectId);
      return c.json(integration);
    },
  )
  .post(
    "/project/:projectId",
    describeRoute({
      summary: "Create GitHub integration",
      description: "Create a GitHub integration for a project",
      responses: {
        200: {
          description: "Created integration",
          content: {
            "application/json": {
              schema: resolver(githubIntegrationSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator(
      "json",
      z.object({
        repositoryOwner: z.string().min(1),
        repositoryName: z.string().min(1),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { repositoryOwner, repositoryName } = c.req.valid("json");
      const integration = await createGithubIntegration({
        projectId,
        repositoryOwner,
        repositoryName,
      });
      return c.json(integration);
    },
  )
  .delete(
    "/project/:projectId",
    describeRoute({
      summary: "Delete GitHub integration",
      description: "Delete GitHub integration for a project",
      responses: {
        200: {
          description: "Deletion result",
          content: {
            "application/json": {
              schema: resolver(z.object({ success: z.boolean() })),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const result = await deleteGithubIntegration(projectId);
      return c.json(result);
    },
  )
  .post(
    "/import-issues",
    describeRoute({
      summary: "Import GitHub issues",
      description: "Import GitHub issues as tasks for a project",
      responses: {
        200: {
          description: "Import result",
          content: {
            "application/json": {
              schema: resolver(
                z.object({ message: z.string(), count: z.number() }),
              ),
            },
          },
        },
      },
    }),
    zValidator("json", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("json");
      const result = await importIssues(projectId);
      return c.json(result);
    },
  )
  .post(
    "/webhook",
    describeRoute({
      summary: "GitHub webhook",
      description: "Handle GitHub webhook events",
      responses: {
        200: {
          description: "Webhook processed",
          content: {
            "application/json": {
              schema: resolver(z.object({ status: z.string() })),
            },
          },
        },
        400: {
          description: "Error",
          content: {
            "application/json": {
              schema: resolver(z.object({ error: z.string() })),
            },
          },
        },
      },
    }),
    async (c) => {
      try {
        if (!githubApp) {
          return c.json({ error: "GitHub integration not configured" }, 400);
        }

        const arrayBuffer = await c.req.arrayBuffer();
        const body = Buffer.from(arrayBuffer).toString("utf8");

        const signature = c.req.header("x-hub-signature-256");
        if (!signature) {
          return c.json({ error: "Missing signature" }, 400);
        }

        const eventName = c.req.header("x-github-event");
        if (!eventName) {
          return c.json({ error: "Missing event name" }, 400);
        }

        const deliveryId = c.req.header("x-github-delivery") || "";

        await githubApp.webhooks.verifyAndReceive({
          id: deliveryId,
          name: eventName as "issues" | "pull_request" | "push" | string,
          signature,
          payload: body,
        });

        return c.json({ status: "success" });
      } catch (error) {
        console.error("Webhook processing error:", error);
        return c.json({ error: "Webhook processing failed" }, 400);
      }
    },
  );

export default githubIntegration;
