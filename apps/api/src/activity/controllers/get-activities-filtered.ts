import { and, desc, eq, gte } from "drizzle-orm";
import db from "../../database";
import {
  activityTable,
  projectTable,
  taskTable,
  userTable,
  workspaceTable,
} from "../../database/schema";

type FilterParams = {
  projectId?: string;
  workspaceId?: string;
  userId?: string;
  createdAfter?: string; // ISO datetime string
};

async function getActivitiesFiltered(params: FilterParams = {}) {
  const {
    projectId,
    workspaceId,
    userId,
    createdAfter,
  } = params;

  // Build date filter
  let dateFilter: ReturnType<typeof gte> | undefined;
  
  if (createdAfter) {
    const date = new Date(createdAfter);
    if (!isNaN(date.getTime())) {
      dateFilter = gte(activityTable.createdAt, date);
    }
  }

  // Build where conditions
  const conditions = [];
  
  if (projectId) {
    conditions.push(eq(taskTable.projectId, projectId));
  }
  
  if (workspaceId) {
    conditions.push(eq(projectTable.workspaceId, workspaceId));
  }
  
  if (userId) {
    conditions.push(eq(activityTable.userId, userId));
  }
  
  if (dateFilter) {
    conditions.push(dateFilter);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const activities = await db
    .select({
      id: activityTable.id,
      taskId: activityTable.taskId,
      type: activityTable.type,
      userId: activityTable.userId,
      content: activityTable.content,
      createdAt: activityTable.createdAt,
      // Task info
      taskTitle: taskTable.title,
      taskNumber: taskTable.number,
      // Project info
      projectId: projectTable.id,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      // Workspace info
      workspaceId: workspaceTable.id,
      workspaceName: workspaceTable.name,
      // User info
      userName: userTable.name,
      userEmail: userTable.email,
    })
    .from(activityTable)
    .leftJoin(taskTable, eq(activityTable.taskId, taskTable.id))
    .leftJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(workspaceTable, eq(projectTable.workspaceId, workspaceTable.id))
    .leftJoin(userTable, eq(activityTable.userId, userTable.id))
    .where(whereClause)
    .orderBy(desc(activityTable.createdAt));

  return activities;
}

export default getActivitiesFiltered;
export type { FilterParams };

