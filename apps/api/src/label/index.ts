import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import createLabel from "./controllers/create-label";
import deleteLabel from "./controllers/delete-label";
import getLabel from "./controllers/get-label";
import getLabelsByTaskId from "./controllers/get-labels-by-task-id";
import getLabelsByWorkspaceId from "./controllers/get-labels-by-workspace-id";
import updateLabel from "./controllers/update-label";

const labelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  taskId: z.string().nullable(),
  workspaceId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const label = new Hono<{
  Variables: {
    userId: string;
  };
}>()
  .get(
    "/task/:taskId",
    describeRoute({
      summary: "Get labels by task",
      description: "Get all labels for a task",
      responses: {
        200: {
          description: "List of labels",
          content: {
            "application/json": {
              schema: resolver(z.array(labelSchema)),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const labels = await getLabelsByTaskId(taskId);
      return c.json(labels);
    },
  )
  .get(
    "/workspace/:workspaceId",
    describeRoute({
      summary: "Get labels by workspace",
      description: "Get all labels for a workspace",
      responses: {
        200: {
          description: "List of labels",
          content: {
            "application/json": {
              schema: resolver(z.array(labelSchema)),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const labels = await getLabelsByWorkspaceId(workspaceId);
      return c.json(labels);
    },
  )
  .post(
    "/",
    describeRoute({
      summary: "Create label",
      description: "Create a new label",
      responses: {
        200: {
          description: "Created label",
          content: {
            "application/json": {
              schema: resolver(labelSchema),
            },
          },
        },
      },
    }),
    zValidator(
      "json",
      z.object({
        name: z.string(),
        color: z.string(),
        taskId: z.string().optional(),
        workspaceId: z.string(),
      }),
    ),
    async (c) => {
      const { name, color, taskId, workspaceId } = c.req.valid("json");
      const label = await createLabel(name, color, taskId, workspaceId);
      return c.json(label);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      summary: "Delete label",
      description: "Delete a label by ID",
      responses: {
        200: {
          description: "Deleted label",
          content: {
            "application/json": {
              schema: resolver(labelSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const label = await deleteLabel(id);
      return c.json(label);
    },
  )
  .get(
    "/:id",
    describeRoute({
      summary: "Get label",
      description: "Get a label by ID",
      responses: {
        200: {
          description: "Label details",
          content: {
            "application/json": {
              schema: resolver(labelSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const label = await getLabel(id);
      return c.json(label);
    },
  )
  .put(
    "/:id",
    describeRoute({
      summary: "Update label",
      description: "Update a label by ID",
      responses: {
        200: {
          description: "Updated label",
          content: {
            "application/json": {
              schema: resolver(labelSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ name: z.string(), color: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name, color } = c.req.valid("json");
      const label = await updateLabel(id, name, color);
      return c.json(label);
    },
  );

export default label;
