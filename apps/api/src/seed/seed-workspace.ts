import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import db from "../database";
import {
  labelTable,
  projectTable,
  taskTable,
  userTable,
  workspaceUserTable,
} from "../database/schema";
import getNextTaskNumber from "../task/controllers/get-next-task-number";
import {
  SEED_COMPLETED_PROJECTS,
  SEED_COMPLETED_TASKS,
  SEED_LABELS,
  SEED_MEMBERS,
  SEED_PROJECTS,
  SEED_TASKS,
} from "./seed-data";

interface SeedWorkspaceOptions {
  workspaceId: string;
  ownerUserId: string;
}
/**
 * Seeds a workspace with demo data:
 * - 7 members (demo users with profile pictures)
 * - 3 active feature-based projects
 * - 2 completed projects (archived)
 * - ~135 tasks distributed across projects with variable completion rates
 * - 8 workspace labels
 * - Tasks with varied statuses, priorities, due dates, and label assignments
 * - Members have randomized join dates (3-12 months ago)
 */
export async function seedWorkspace({
  workspaceId,
  ownerUserId,
}: SeedWorkspaceOptions): Promise<void> {
  try {
    // Step 1: Create demo users (members)
    const memberUsers = await Promise.all(
      SEED_MEMBERS.map(async (member) => {
        // Check if user already exists by email
        const existingUser = await db.query.userTable.findFirst({
          where: eq(userTable.email, member.email),
        });

        if (existingUser) {
          // Always update image for demo users to ensure they use local profile pictures
          if (member.image && existingUser.image !== member.image) {
            await db
              .update(userTable)
              .set({ image: member.image })
              .where(eq(userTable.id, existingUser.id));
            return { ...existingUser, image: member.image };
          }
          return existingUser;
        }

        // Create new demo user with profile picture
        const [newUser] = await db
          .insert(userTable)
          .values({
            id: createId(),
            name: member.name,
            email: member.email,
            emailVerified: false,
            isAnonymous: true,
            image: member.image,
          })
          .returning();

        return newUser;
      }),
    );

    const memberUserIds = memberUsers
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => u.id)
      .filter((id): id is string => !!id);

    // Step 2: Add members to workspace with randomized join dates
    // Join dates: 3-12 months ago (everyone at least 3 months old)
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const oneYearAgo = new Date(now);
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);

    const workspaceMemberValues = memberUserIds.map((userId, index) => {
      // Deterministically randomize join date (3-12 months ago)
      // Use index to ensure consistency but create variation
      const monthsAgo = 3 + (index % 9); // 3-11 months ago
      const joinDate = new Date(now);
      joinDate.setMonth(joinDate.getMonth() - monthsAgo);
      // Add some day variation
      joinDate.setDate(joinDate.getDate() - (index % 28));

      return {
        id: createId(),
        workspaceId,
        userId,
        role: "member" as const,
        joinedAt: joinDate,
      };
    });

    // Only insert members that don't already exist in this workspace
    for (const member of workspaceMemberValues) {
      const existing = await db.query.workspaceUserTable.findFirst({
        where: and(
          eq(workspaceUserTable.workspaceId, workspaceId),
          eq(workspaceUserTable.userId, member.userId),
        ),
      });
      if (!existing) {
        await db.insert(workspaceUserTable).values(member);
      }
    }

    // Step 3: Create active projects
    const createdProjects = await Promise.all(
      SEED_PROJECTS.map(async (project) => {
        const [created] = await db
          .insert(projectTable)
          .values({
            id: createId(),
            workspaceId,
            name: project.name,
            slug: project.slug,
            icon: project.icon,
            description: project.description,
          })
          .returning();

        return created;
      }),
    );

    // Step 3b: Create completed projects (archived)
    const createdCompletedProjects = await Promise.all(
      SEED_COMPLETED_PROJECTS.map(async (project) => {
        const [created] = await db
          .insert(projectTable)
          .values({
            id: createId(),
            workspaceId,
            name: project.name,
            slug: project.slug,
            icon: project.icon,
            description: project.description,
          })
          .returning();

        return created;
      }),
    );

    // Step 4: Create workspace-level labels
    const createdLabels = await Promise.all(
      SEED_LABELS.map(async (label) => {
        const [created] = await db
          .insert(labelTable)
          .values({
            id: createId(),
            workspaceId,
            name: label.name,
            color: label.color,
          })
          .returning();

        return created;
      }),
    );

    // Create a map of label names to IDs for quick lookup
    const labelMap = new Map(
      createdLabels
        .filter((label): label is NonNullable<typeof label> => !!label)
        .map((label) => [label.name, label.id]),
    );

    // Step 5: Create tasks for each project
    const allUserIds = [ownerUserId, ...memberUserIds];

    for (const project of createdProjects) {
      if (!project) continue;
      const projectSlug = project.slug as keyof typeof SEED_TASKS;
      const taskTemplates = SEED_TASKS[projectSlug] || [];

      // Get starting task number for this project
      const startingTaskNumber = await getNextTaskNumber(project.id);

      // Calculate a project-specific base offset (0-60 days)
      // This ensures each project's earliest task due date varies
      let projectHash = 0;
      for (let i = 0; i < projectSlug.length; i++) {
        const char = projectSlug.charCodeAt(i);
        projectHash = (projectHash << 5) - projectHash + char;
        projectHash = projectHash & projectHash;
      }
      const projectBaseOffset = Math.abs(projectHash % 60); // 0-59 days

      // Prepare task values for batch insert
      const taskValues = taskTemplates.map((template, index) => {
        const taskNumber = startingTaskNumber + index + 1;

        // Calculate due date if needed
        // Generate random due dates within the next 3 months (1-90 days)
        // Use project base offset + task-specific variation to ensure:
        // - Each project has varied earliest due dates
        // - Tasks within a project have varied dates
        // - All dates are always in the future (1-90 days from now)
        let dueDate: Date | null = null;
        if (template.hasDueDate) {
          // Create a pseudo-random number for task-specific variation
          const taskSeed = `${projectSlug}-${index}-${template.title}`;
          let taskHash = 0;
          for (let i = 0; i < taskSeed.length; i++) {
            const char = taskSeed.charCodeAt(i);
            taskHash = (taskHash << 5) - taskHash + char;
            taskHash = taskHash & taskHash;
          }
          // Task variation: 1-30 days
          const taskVariation = Math.abs(taskHash % 30) + 1;
          // Total days: project base (0-59) + task variation (1-30) = 1-89 days
          // Ensure it doesn't exceed 90 days
          const daysFromNow = Math.min(projectBaseOffset + taskVariation, 90);
          dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + daysFromNow);
        }

        // Assignment logic:
        // - Planned (backlog) tasks: always unassigned
        // - To-do tasks: ~1/3 unassigned (deterministically)
        // - In-progress and onwards: always assigned
        let assigneeId: string | null = null;
        if (template.status === "planned") {
          // Backlog tasks are always unassigned
          assigneeId = null;
        } else if (template.status === "to-do") {
          // ~1/3 of to-do tasks are unassigned (every 3rd task)
          if (index % 3 !== 0 && allUserIds.length > 0) {
            assigneeId = allUserIds[index % allUserIds.length] || null;
          }
        } else {
          // In-progress, in-review, done: always assigned
          if (allUserIds.length > 0) {
            assigneeId = allUserIds[index % allUserIds.length] || null;
          }
        }

        return {
          id: createId(),
          projectId: project.id,
          userId: assigneeId,
          title: template.title,
          description: "",
          status: template.status,
          priority: template.priority || "low",
          dueDate,
          number: taskNumber,
          position: 0,
        };
      });

      // Batch insert tasks
      if (taskValues.length > 0) {
        const insertedTasks = await db
          .insert(taskTable)
          .values(taskValues)
          .returning();

        // Step 6: Assign labels to tasks
        const labelAssignments: Array<{
          id: string;
          taskId: string;
          workspaceId: string;
          name: string;
          color: string;
        }> = [];

        insertedTasks.forEach((task, index) => {
          const template = taskTemplates[index];
          if (template?.labels && template.labels.length > 0) {
            // Deterministically assign labels (use modulo to vary assignment)
            // This ensures consistent results while still having variation
            const numLabelsToAssign = (index % 3) + 1; // 1-3 labels per task
            const labelsToAssign = template.labels.slice(
              0,
              Math.min(template.labels.length, numLabelsToAssign),
            );

            labelsToAssign.forEach((labelName) => {
              const labelId = labelMap.get(labelName);
              if (labelId) {
                labelAssignments.push({
                  id: createId(),
                  taskId: task.id,
                  workspaceId,
                  name: labelName,
                  color:
                    SEED_LABELS.find((l) => l.name === labelName)?.color ||
                    "64748B",
                });
              }
            });
          }
        });

        // Batch insert task labels
        if (labelAssignments.length > 0) {
          await db.insert(labelTable).values(
            labelAssignments.map((assignment) => ({
              id: assignment.id,
              taskId: assignment.taskId,
              workspaceId: assignment.workspaceId,
              name: assignment.name,
              color: assignment.color,
            })),
          );
        }
      }
    }

    // Step 5b: Create tasks for completed projects (all tasks are done)
    for (const project of createdCompletedProjects) {
      if (!project) continue;
      const projectSlug = project.slug as keyof typeof SEED_COMPLETED_TASKS;
      const taskTemplates = SEED_COMPLETED_TASKS[projectSlug] || [];

      const startingTaskNumber = await getNextTaskNumber(project.id);

      const taskValues = taskTemplates.map((template, index) => {
        const taskNumber = startingTaskNumber + index + 1;
        const assigneeId = allUserIds[index % allUserIds.length];

        return {
          id: createId(),
          projectId: project.id,
          userId: assigneeId,
          title: template.title,
          description: "",
          status: "done", // All completed project tasks are done
          priority: template.priority || "low",
          dueDate: null, // Completed tasks don't have due dates
          number: taskNumber,
          position: 0,
        };
      });

      if (taskValues.length > 0) {
        const insertedTasks = await db
          .insert(taskTable)
          .values(taskValues)
          .returning();

        // Assign labels to completed project tasks
        const labelAssignments: Array<{
          id: string;
          taskId: string;
          workspaceId: string;
          name: string;
          color: string;
        }> = [];

        insertedTasks.forEach((task, index) => {
          const template = taskTemplates[index];
          if (template?.labels && template.labels.length > 0) {
            const numLabelsToAssign = (index % 3) + 1;
            const labelsToAssign = template.labels.slice(
              0,
              Math.min(template.labels.length, numLabelsToAssign),
            );

            labelsToAssign.forEach((labelName) => {
              const labelId = labelMap.get(labelName);
              if (labelId) {
                labelAssignments.push({
                  id: createId(),
                  taskId: task.id,
                  workspaceId,
                  name: labelName,
                  color:
                    SEED_LABELS.find((l) => l.name === labelName)?.color ||
                    "64748B",
                });
              }
            });
          }
        });

        if (labelAssignments.length > 0) {
          await db.insert(labelTable).values(
            labelAssignments.map((assignment) => ({
              id: assignment.id,
              taskId: assignment.taskId,
              workspaceId: assignment.workspaceId,
              name: assignment.name,
              color: assignment.color,
            })),
          );
        }
      }
    }
  } catch (error) {
    console.error("Error seeding workspace:", error);
    // Don't throw - seeding failure shouldn't break workspace creation
  }
}
