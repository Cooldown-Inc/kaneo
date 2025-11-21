import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import { subscribeToEvent } from "../events";
import toNormalCase from "../utils/to-normal-case";
import createActivity from "./controllers/create-activity";
import createComment from "./controllers/create-comment";
import deleteComment from "./controllers/delete-comment";
import getActivitiesFromTaskId from "./controllers/get-activities";
import getActivitiesFiltered from "./controllers/get-activities-filtered";
import updateComment from "./controllers/update-comment";

const activitySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  type: z.string(),
  userId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const filteredActivitySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  type: z.string(),
  userId: z.string(),
  content: z.string().nullable(),
  createdAt: z.string(),
  taskTitle: z.string().nullable(),
  taskNumber: z.number().nullable(),
  projectId: z.string().nullable(),
  projectName: z.string().nullable(),
  projectSlug: z.string().nullable(),
  workspaceId: z.string().nullable(),
  workspaceName: z.string().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
});

const activity = new Hono()
  .get(
    "/",
    describeRoute({
      summary: "Get activities with filters",
      description: "Get activities filtered by project, workspace, user, or date range. Requires workspaceId and user must have access to the workspace.",
      responses: {
        200: {
          description: "List of filtered activities",
          content: {
            "application/json": {
              schema: resolver(z.array(filteredActivitySchema)),
            },
          },
        },
      },
    }),
    zValidator(
      "query",
      z.object({
        projectId: z.string().optional(),
        workspaceId: z.string(),
        userId: z.string().optional(),
        createdAfter: z.string().optional(),
      }),
    ),
    async (c) => {
      const query = c.req.valid("query");
      const userId = c.get("userId");
      
      if (!userId) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const activities = await getActivitiesFiltered({
        projectId: query.projectId,
        workspaceId: query.workspaceId,
        userId: query.userId,
        createdAfter: query.createdAfter,
        requestingUserId: userId,
      });
      return c.json(activities);
    },
  )
  .get(
    "/:taskId",
    describeRoute({
      summary: "Get activities by task",
      description: "Get all activities for a task",
      responses: {
        200: {
          description: "List of activities",
          content: {
            "application/json": {
              schema: resolver(z.array(activitySchema)),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const activities = await getActivitiesFromTaskId(taskId);
      return c.json(activities);
    },
  )
  .post(
    "/create",
    describeRoute({
      summary: "Create activity",
      description: "Create a new activity",
      responses: {
        200: {
          description: "Created activity",
          content: {
            "application/json": {
              schema: resolver(activitySchema),
            },
          },
        },
      },
    }),
    zValidator(
      "json",
      z.object({
        taskId: z.string(),
        type: z.string(),
        userId: z.string(),
        content: z.string(),
      }),
    ),
    async (c) => {
      const { taskId, type, userId, content } = c.req.valid("json");
      const activity = await createActivity(taskId, type, userId, content);
      return c.json(activity);
    },
  )
  .post(
    "/comment",
    describeRoute({
      summary: "Create comment",
      description: "Create a new comment on a task",
      responses: {
        200: {
          description: "Created comment",
          content: {
            "application/json": {
              schema: resolver(activitySchema),
            },
          },
        },
      },
    }),
    zValidator(
      "json",
      z.object({
        taskId: z.string(),
        content: z.string(),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { taskId, content, userId } = c.req.valid("json");
      const activity = await createComment(taskId, userId, content);
      return c.json(activity);
    },
  )
  .put(
    "/comment",
    describeRoute({
      summary: "Update comment",
      description: "Update a comment by ID",
      responses: {
        200: {
          description: "Updated comment",
          content: {
            "application/json": {
              schema: resolver(activitySchema),
            },
          },
        },
      },
    }),
    zValidator(
      "json",
      z.object({
        id: z.string(),
        content: z.string(),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { id, content, userId } = c.req.valid("json");
      const activity = await updateComment(userId, id, content);
      return c.json(activity);
    },
  )
  .delete(
    "/comment",
    describeRoute({
      summary: "Delete comment",
      description: "Delete a comment by ID",
      responses: {
        200: {
          description: "Success message",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string() })),
            },
          },
        },
      },
    }),
    zValidator(
      "json",
      z.object({
        id: z.string(),
        userId: z.string(),
      }),
    ),
    async (c) => {
      const { id, userId } = c.req.valid("json");
      await deleteComment(userId, id);
      return c.json({ message: "Comment deleted" });
    },
  );

subscribeToEvent(
  "task.created",
  async ({
    taskId,
    userId,
    type,
    content,
  }: {
    taskId: string;
    userId: string;
    type: string;
    content: string;
  }) => {
    if (!userId || !taskId || !type || !content) {
      return;
    }

    await createActivity(taskId, type, userId, content);
  },
);

subscribeToEvent(
  "task.assignee_changed",
  async ({
    taskId,
    userId,
    type,
    newAssignee,
  }: {
    taskId: string;
    userId: string;
    type: string;
    newAssignee: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `assigned the task to ${newAssignee}`,
    );
  },
);

subscribeToEvent(
  "task.unassigned",
  async ({
    taskId,
    userId,
    type,
  }: {
    taskId: string;
    userId: string;
    type: string;
  }) => {
    await createActivity(taskId, type, userId, "unassigned the task");
  },
);

subscribeToEvent(
  "task.status_changed",
  async ({
    taskId,
    userId,
    type,
    oldStatus,
    newStatus,
  }: {
    taskId: string;
    userId: string;
    type: string;
    oldStatus: string;
    newStatus: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `changed the status from ${toNormalCase(oldStatus)} to ${toNormalCase(newStatus)}`,
    );
  },
);

subscribeToEvent(
  "task.priority_changed",
  async ({
    taskId,
    userId,
    type,
    oldPriority,
    newPriority,
  }: {
    taskId: string;
    userId: string;
    type: string;
    oldPriority: string;
    newPriority: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `changed the priority from ${oldPriority} to ${newPriority}`,
    );
  },
);

subscribeToEvent(
  "task.due_date_changed",
  async ({
    taskId,
    userId,
    type,
    newDueDate,
  }: {
    taskId: string;
    userId: string;
    type: string;
    newDueDate: string;
  }) => {
    await createActivity(
      taskId,
      type,
      userId,
      `changed the due date to ${new Date(newDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    );
  },
);

export default activity;
