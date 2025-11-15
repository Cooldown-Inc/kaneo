import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import createProject from "./controllers/create-project";
import deleteProject from "./controllers/delete-project";
import getProject from "./controllers/get-project";
import getProjects from "./controllers/get-projects";
import updateProject from "./controllers/update-project";

const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  workspaceId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const createProjectSchema = z.object({
  name: z.string(),
  workspaceId: z.string(),
  icon: z.string(),
  slug: z.string(),
});

const updateProjectSchema = z.object({
  name: z.string(),
  icon: z.string(),
  slug: z.string(),
  description: z.string(),
  isPublic: z.boolean(),
});

const project = new Hono()
  .get(
    "/",
    describeRoute({
      summary: "Get projects",
      description: "Get all projects for a workspace",
      responses: {
        200: {
          description: "List of projects",
          content: {
            "application/json": {
              schema: resolver(z.array(projectSchema)),
            },
          },
        },
      },
    }),
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("query");
      const projects = await getProjects(workspaceId);
      return c.json(projects);
    },
  )
  .post(
    "/",
    describeRoute({
      summary: "Create project",
      description: "Create a new project",
      responses: {
        200: {
          description: "Created project",
          content: {
            "application/json": {
              schema: resolver(projectSchema),
            },
          },
        },
      },
    }),
    zValidator("json", createProjectSchema),
    async (c) => {
      const { name, workspaceId, icon, slug } = c.req.valid("json");
      const project = await createProject(workspaceId, name, icon, slug);
      return c.json(project);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      summary: "Delete project",
      description: "Delete a project by ID",
      responses: {
        200: {
          description: "Deleted project",
          content: {
            "application/json": {
              schema: resolver(projectSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const project = await deleteProject(id);
      return c.json(project);
    },
  )
  .put(
    "/:id",
    describeRoute({
      summary: "Update project",
      description: "Update a project by ID",
      responses: {
        200: {
          description: "Updated project",
          content: {
            "application/json": {
              schema: resolver(projectSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("json", updateProjectSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const { name, icon, slug, description, isPublic } = c.req.valid("json");
      const project = await updateProject(
        id,
        name,
        icon,
        slug,
        description,
        isPublic,
      );
      return c.json(project);
    },
  )
  .get(
    "/:id",
    describeRoute({
      summary: "Get project",
      description: "Get a project by ID",
      responses: {
        200: {
          description: "Project details",
          content: {
            "application/json": {
              schema: resolver(projectSchema),
            },
          },
        },
      },
    }),
    zValidator("param", z.object({ id: z.string() })),
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const { workspaceId } = c.req.valid("query");
      const project = await getProject(id, workspaceId);
      return c.json(project);
    },
  );

export default project;
