import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  labelTable,
  projectTable,
  taskTable,
  userTable,
} from "../../database/schema";

interface GetTasksByWorkspaceParams {
  workspaceId: string;
  projectId?: string;
  userId?: string;
  status?: string;
  labels?: string[];
  minimumDueDate?: string;
  maximumDueDate?: string;
}

async function getTasksByWorkspace(params: GetTasksByWorkspaceParams) {
  const {
    workspaceId,
    projectId,
    userId,
    status,
    labels,
    minimumDueDate,
    maximumDueDate,
  } = params;

  // Build where conditions
  const conditions = [];

  // Workspace filter - join with project table
  conditions.push(eq(projectTable.workspaceId, workspaceId));

  // Project filter
  if (projectId) {
    conditions.push(eq(taskTable.projectId, projectId));
  }

  // User filter (assigned to)
  if (userId) {
    conditions.push(eq(taskTable.userId, userId));
  }

  // Status filter
  if (status) {
    conditions.push(eq(taskTable.status, status));
  }

  // Due date filters
  if (minimumDueDate) {
    const minDate = new Date(minimumDueDate);
    if (!isNaN(minDate.getTime())) {
      conditions.push(gte(taskTable.dueDate, minDate));
    }
  }

  if (maximumDueDate) {
    const maxDate = new Date(maximumDueDate);
    if (!isNaN(maxDate.getTime())) {
      conditions.push(lte(taskTable.dueDate, maxDate));
    }
  }

  // If labels filter is provided, we need to filter tasks that have at least one of the specified labels
  if (labels && labels.length > 0) {
    // Get task IDs that have any of the specified labels
    const tasksWithLabels = await db
      .selectDistinct({ taskId: labelTable.taskId })
      .from(labelTable)
      .where(
        and(
          inArray(labelTable.name, labels),
          sql`${labelTable.taskId} IS NOT NULL`,
        ),
      );

    const taskIds = tasksWithLabels
      .map((t) => t.taskId)
      .filter((id): id is string => id !== null);

    if (taskIds.length === 0) {
      // No tasks have the specified labels, return empty array
      return [];
    }

    // Add task ID filter
    conditions.push(inArray(taskTable.id, taskIds));
  }

  // Build query with all conditions
  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      description: taskTable.description,
      status: taskTable.status,
      priority: taskTable.priority,
      dueDate: taskTable.dueDate,
      position: taskTable.position,
      createdAt: taskTable.createdAt,
      userId: taskTable.userId,
      projectId: taskTable.projectId,
    })
    .from(taskTable)
    .leftJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(and(...conditions))
    .orderBy(taskTable.position);

  // Transform tasks to match taskSchema format
  // Note: taskSchema expects updatedAt but taskTable doesn't have it
  // Using createdAt as updatedAt to match schema expectations
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority || "low",
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    projectId: task.projectId,
    userId: task.userId,
    position: task.position,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.createdAt.toISOString(), // taskTable doesn't have updatedAt, using createdAt
  }));
}

export default getTasksByWorkspace;

