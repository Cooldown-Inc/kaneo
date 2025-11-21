import { and, desc, eq, gte } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  activityTable,
  projectTable,
  taskTable,
  userTable,
  workspaceTable,
  workspaceUserTable,
} from "../../database/schema";

type FilterParams = {
  projectId?: string;
  workspaceId: string;
  userId?: string;
  createdAfter?: string; // ISO datetime string
  requestingUserId: string;
};

async function getActivitiesFiltered(params: FilterParams) {
  const {
    projectId,
    workspaceId,
    userId,
    createdAfter,
    requestingUserId,
  } = params;

  // Validate that the requesting user has access to the workspace
  const workspaceMember = await db
    .select()
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, workspaceId),
        eq(workspaceUserTable.userId, requestingUserId),
      ),
    )
    .limit(1);

  if (workspaceMember.length === 0) {
    throw new HTTPException(403, {
      message: "You do not have access to this workspace",
    });
  }

  // Build date filter
  let dateFilter: ReturnType<typeof gte> | undefined;
  
  if (createdAfter) {
    const date = new Date(createdAfter);
    if (!isNaN(date.getTime())) {
      dateFilter = gte(activityTable.createdAt, date);
    }
  }

  // Build where conditions
  // Always filter by workspaceId to ensure we only return activities from the requested workspace
  const conditions = [eq(projectTable.workspaceId, workspaceId)];
  
  if (projectId) {
    conditions.push(eq(taskTable.projectId, projectId));
  }
  
  if (userId) {
    conditions.push(eq(activityTable.userId, userId));
  }
  
  if (dateFilter) {
    conditions.push(dateFilter);
  }

  const whereClause = and(...conditions);

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

