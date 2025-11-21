import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { describeRoute, resolver } from "hono-openapi";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "../auth";
import db from "../database";
import { taskTable } from "../database/schema";
import { publishEvent } from "../events";
import createTask from "./controllers/create-task";
import deleteTask from "./controllers/delete-task";
import exportTasks from "./controllers/export-tasks";
import getTask from "./controllers/get-task";
import getTasks from "./controllers/get-tasks";
import getTasksByWorkspace from "./controllers/get-tasks-by-workspace";
import importTasks from "./controllers/import-tasks";
import updateTask from "./controllers/update-task";
import updateTaskAssignee from "./controllers/update-task-assignee";
import updateTaskDescription from "./controllers/update-task-description";
import updateTaskDueDate from "./controllers/update-task-due-date";
import updateTaskPriority from "./controllers/update-task-priority";
import updateTaskStatus from "./controllers/update-task-status";
import updateTaskTitle from "./controllers/update-task-title";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  priority: z.string(),
  dueDate: z.string().nullable(),
  projectId: z.string(),
  userId: z.string().nullable(),
  position: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const task = new Hono<{
  Variables: {
    userId: string;
  };
}>()
  .get(
    "/tasks/:projectId",
    describeRoute({
      summary: "Get tasks by project",
      description: "Get all tasks for a project",
      responses: {
        200: {
          description: "List of tasks",
          content: {
            "application/json": {
              schema: resolver(z.array(taskSchema)),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const tasks = await getTasks(projectId);
      return c.json(tasks);
    },
  )
  .get(
    "/workspace/:workspaceId",
    describeRoute({
      summary: "Get tasks by workspace",
      description: "Get tasks for a workspace with optional filters",
      responses: {
        200: {
          description: "List of filtered tasks",
          content: {
            "application/json": {
              schema: resolver(z.array(taskSchema)),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator(
      "query",
      z.object({
        projectId: z.string().optional(),
        userId: z.string().optional(),
        status: z.string().optional(),
        labels: z.string().optional(), // Comma-separated list of label names
        minimumDueDate: z.string().optional(),
        maximumDueDate: z.string().optional(),
      }),
    ),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const query = c.req.valid("query");

      // Parse labels from comma-separated string
      const labels = query.labels
        ? query.labels.split(",").map((l) => l.trim()).filter(Boolean)
        : undefined;

      const tasks = await getTasksByWorkspace({
        workspaceId,
        projectId: query.projectId,
        userId: query.userId,
        status: query.status,
        labels,
        minimumDueDate: query.minimumDueDate,
        maximumDueDate: query.maximumDueDate,
      });

      return c.json(tasks);
    },
  )
  .post(
    "/:projectId",
    describeRoute({
      summary: "Create task",
      description: "Create a new task in a project",
      responses: {
        200: {
          description: "Created task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator(
      "json",
      z.object({
        title: z.string(),
        description: z.string(),
        dueDate: z.string().optional(),
        priority: z.string(),
        status: z.string(),
        userId: z.string().optional(),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.param();
      const { title, description, dueDate, priority, status, userId } =
        c.req.valid("json");

      const task = await createTask({
        projectId,
        userId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
        status,
      });

      return c.json(task);
    },
  )
  .get(
    "/:id",
    describeRoute({
      summary: "Get task",
      description: "Get a task by ID",
      responses: {
        200: {
          description: "Task details",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const task = await getTask(id);
      return c.json(task);
    },
  )
  .put(
    "/:id",
    describeRoute({
      summary: "Update task",
      description: "Update a task by ID",
      responses: {
        200: {
          description: "Updated task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z.object({
        title: z.string(),
        description: z.string(),
        dueDate: z.string().optional(),
        priority: z.string(),
        status: z.string(),
        projectId: z.string(),
        position: z.number(),
        userId: z.string().optional(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid("param");
      const {
        title,
        description,
        dueDate,
        priority,
        status,
        projectId,
        position,
        userId,
      } = c.req.valid("json");
      const user = c.get("userId");

      // Get the old task before updating
      const oldTask = await db.query.taskTable.findFirst({
        where: eq(taskTable.id, id),
      });

      if (!oldTask) {
        throw new HTTPException(404, {
          message: "Task not found",
        });
      }

      // Update the task
      const updatedTask = await updateTask(
        id,
        title,
        status,
        dueDate ? new Date(dueDate) : undefined,
        projectId,
        description,
        priority,
        position,
        userId,
      );

      // Detect changes and publish events
      if (oldTask.status !== status) {
        await publishEvent("task.status_changed", {
          taskId: updatedTask.id,
          userId: user,
          oldStatus: oldTask.status,
          newStatus: status,
          title: updatedTask.title,
          type: "status_changed",
        });
      }

      if (oldTask.priority !== priority) {
        await publishEvent("task.priority_changed", {
          taskId: updatedTask.id,
          userId: user,
          oldPriority: oldTask.priority,
          newPriority: priority,
          title: updatedTask.title,
          type: "priority_changed",
        });
      }

      // Normalize userId for comparison (undefined/empty string becomes null)
      const normalizedUserId = userId || null;
      const normalizedOldUserId = oldTask.userId || null;

      if (normalizedOldUserId !== normalizedUserId) {
        const members = await auth.api.listMembers({
          headers: c.req.header(),
        });

        const newAssigneeName = normalizedUserId
          ? members.members.find(
              (member) => member.userId === normalizedUserId,
            )?.user?.name
          : null;

        if (!normalizedUserId) {
          await publishEvent("task.unassigned", {
            taskId: updatedTask.id,
            userId: user,
            title: updatedTask.title,
            type: "unassigned",
          });
        } else {
          await publishEvent("task.assignee_changed", {
            taskId: updatedTask.id,
            userId: user,
            oldAssignee: normalizedOldUserId,
            newAssignee: newAssigneeName,
            title: updatedTask.title,
            type: "assignee_changed",
          });
        }
      }

      const oldDueDateStr = oldTask.dueDate
        ? new Date(oldTask.dueDate).toISOString()
        : null;
      const newDueDateStr = dueDate ? new Date(dueDate).toISOString() : null;

      if (oldDueDateStr !== newDueDateStr) {
        await publishEvent("task.due_date_changed", {
          taskId: updatedTask.id,
          userId: user,
          oldDueDate: oldTask.dueDate
            ? new Date(oldTask.dueDate).toISOString()
            : null,
          newDueDate: dueDate || null,
          title: updatedTask.title,
          type: "due_date_changed",
        });
      }

      if (oldTask.title !== title) {
        await publishEvent("task.title_changed", {
          taskId: updatedTask.id,
          userId: user,
          oldTitle: oldTask.title,
          newTitle: title,
          title: updatedTask.title,
          type: "title_changed",
        });
      }

      if (oldTask.description !== description) {
        await publishEvent("task.description_changed", {
          taskId: updatedTask.id,
          userId: user,
          title: updatedTask.title,
          type: "description_changed",
        });
      }

      return c.json(updatedTask);
    },
  )
  .get(
    "/export/:projectId",
    describeRoute({
      summary: "Export tasks",
      description: "Export all tasks from a project",
      responses: {
        200: {
          description: "Exported tasks data",
          content: {
            "application/json": {
              schema: resolver(z.object({ tasks: z.array(taskSchema) })),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ projectId: z.string() })),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const exportData = await exportTasks(projectId);
      return c.json(exportData);
    },
  )
  .post(
    "/import/:projectId",
    describeRoute({
      summary: "Import tasks",
      description: "Import tasks into a project",
      responses: {
        200: {
          description: "Import result",
          content: {
            "application/json": {
              schema: resolver(z.object({ message: z.string(), count: z.number() })),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ projectId: z.string() })),
    zValidator(
      "json",
      z.object({
        tasks: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            status: z.string(),
            priority: z.string().optional(),
            dueDate: z.string().optional(),
            userId: z.string().nullable().optional(),
          }),
        ),
      }),
    ),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { tasks } = c.req.valid("json");
      const result = await importTasks(projectId, tasks);
      return c.json(result);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      summary: "Delete task",
      description: "Delete a task by ID",
      responses: {
        200: {
          description: "Deleted task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const task = await deleteTask(id);
      return c.json(task);
    },
  )
  .put(
    "/status/:id",
    describeRoute({
      summary: "Update task status",
      description: "Update the status of a task",
      responses: {
        200: {
          description: "Updated task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ status: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { status } = c.req.valid("json");
      const user = c.get("userId");

      const task = await updateTaskStatus({ id, status });

      await publishEvent("task.status_changed", {
        taskId: task.id,
        userId: user,
        oldStatus: task.status,
        newStatus: status,
        title: task.title,
        type: "status_changed",
      });

      return c.json(task);
    },
  )
  .put(
    "/priority/:id",
    describeRoute({
      summary: "Update task priority",
      description: "Update the priority of a task",
      responses: {
        200: {
          description: "Updated task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ priority: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { priority } = c.req.valid("json");
      const user = c.get("userId");

      const task = await updateTaskPriority({ id, priority });

      await publishEvent("task.priority_changed", {
        taskId: task.id,
        userId: user,
        oldPriority: task.priority,
        newPriority: priority,
        title: task.title,
        type: "priority_changed",
      });

      return c.json(task);
    },
  )
  .put(
    "/assignee/:id",
    describeRoute({
      summary: "Update task assignee",
      description: "Update the assignee of a task",
      responses: {
        200: {
          description: "Updated task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ userId: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { userId } = c.req.valid("json");
      const user = c.get("userId");

      const task = await updateTaskAssignee({ id, userId });

      const members = await auth.api.listMembers({
        headers: c.req.header(),
      });

      const newAssigneeName = members.members.find(
        (member) => member.userId === userId,
      )?.user?.name;

      if (!userId) {
        await publishEvent("task.unassigned", {
          taskId: task.id,
          userId: user,
          title: task.title,
          type: "unassigned",
        });
        return c.json(task);
      }

      await publishEvent("task.assignee_changed", {
        taskId: task.id,
        userId: user,
        oldAssignee: task.userId,
        newAssignee: newAssigneeName,
        title: task.title,
        type: "assignee_changed",
      });

      return c.json(task);
    },
  )
  .put(
    "/due-date/:id",
    describeRoute({
      summary: "Update task due date",
      description: "Update the due date of a task",
      responses: {
        200: {
          description: "Updated task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ dueDate: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { dueDate } = c.req.valid("json");
      const user = c.get("userId");

      const task = await updateTaskDueDate({ id, dueDate: new Date(dueDate) });

      await publishEvent("task.due_date_changed", {
        taskId: task.id,
        userId: user,
        oldDueDate: task.dueDate,
        newDueDate: dueDate,
        title: task.title,
        type: "due_date_changed",
      });

      return c.json(task);
    },
  )
  .put(
    "/title/:id",
    describeRoute({
      summary: "Update task title",
      description: "Update the title of a task",
      responses: {
        200: {
          description: "Updated task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ title: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { title } = c.req.valid("json");
      const user = c.get("userId");

      const task = await updateTaskTitle({ id, title });

      await publishEvent("task.title_changed", {
        taskId: task.id,
        userId: user,
        oldTitle: task.title,
        newTitle: title,
        title: task.title,
        type: "title_changed",
      });

      return c.json(task);
    },
  )
  .put(
    "/description/:id",
    describeRoute({
      summary: "Update task description",
      description: "Update the description of a task",
      responses: {
        200: {
          description: "Updated task",
          content: {
            "application/json": {
              schema: resolver(taskSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", z.object({ description: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { description } = c.req.valid("json");
      const user = c.get("userId");

      const task = await updateTaskDescription({ id, description });

      await publishEvent("task.description_changed", {
        taskId: task.id,
        userId: user,
        title: task.title,
        type: "description_changed",
      });

      return c.json(task);
    },
  );

export default task;
