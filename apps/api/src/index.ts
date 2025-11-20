import { serve } from "@hono/node-server";
import type { Session, User } from "better-auth/types";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { describeRoute, openAPIRouteHandler, resolver } from "hono-openapi";
import { z } from "zod";
import activity from "./activity";
import { auth } from "./auth";
import config from "./config";
import db from "./database";
import githubIntegration from "./github-integration";
import label from "./label";

import elseRoutes from "./else";
import mods from "./mods";
import notification from "./notification";
import project from "./project";
import { getPublicProject } from "./project/controllers/get-public-project";
import search from "./search";
import task from "./task";
import timeEntry from "./time-entry";
import { migrateWorkspaceUserEmail } from "./utils/migrate-workspace-user-email";

const app = new Hono<{
  Variables: {
    user: User | null;
    session: Session | null;
    userId: string;
  };
}>();

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : undefined;

/**
 * Check if an origin matches a CORS pattern, supporting wildcard subdomains
 * Examples:
 * - "https://example.com" matches "https://example.com"
 * - "https://app.somethingelse.ai" matches "*.somethingelse.ai" or "https://*.somethingelse.ai"
 * - "https://api.somethingelse.ai" matches "*.somethingelse.ai" or "https://*.somethingelse.ai"
 */
function matchesCorsOrigin(origin: string, pattern: string): boolean {
  // Exact match
  if (origin === pattern) {
    return true;
  }

  // Check for wildcard subdomain pattern (e.g., "*.somethingelse.ai" or "https://*.somethingelse.ai")
  const wildcardMatch = pattern.match(/^(https?:\/\/)?\*\.(.+)$/);
  if (wildcardMatch) {
    const protocol = wildcardMatch[1] || "";
    const domain = wildcardMatch[2];
    
    // Extract protocol and domain from origin
    const originMatch = origin.match(/^(https?:\/\/)(.+)$/);
    if (!originMatch || !originMatch[1] || !originMatch[2]) {
      return false;
    }
    
    const originProtocol = originMatch[1];
    const originDomain = originMatch[2];
    
    // Protocol must match if specified in pattern
    if (protocol && originProtocol !== protocol) {
      return false;
    }
    
    // Check if origin domain ends with the pattern domain
    // e.g., "app.somethingelse.ai" ends with ".somethingelse.ai"
    if (originDomain === domain || originDomain.endsWith(`.${domain}`)) {
      return true;
    }
  }

  return false;
}

app.use(
  "*",
  cors({
    credentials: true,
    origin: (origin) => {
      // Allow all origins - no restrictions
      // This allows the API to be called from any domain
      return origin || "*";
    },
  }),
);

// Request logging middleware for main app
app.use("*", async (c, next) => {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const url = c.req.url;
  const userAgent = c.req.header("user-agent") || "unknown";
  const origin = c.req.header("origin") || "unknown";
  
  console.log(`[${method}] ${path}`, {
    method,
    path,
    url,
    origin,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  await next();

  const duration = Date.now() - startTime;
  const status = c.res.status;
  
  console.log(`[${method}] ${path} ${status}`, {
    method,
    path,
    status,
    statusText: c.res.statusText,
    duration: `${duration}ms`,
  });
});

// Separate Hono instance for API routes (will be mounted at /api)
// This allows us to define routes without the /api prefix here,
// while the client in hono.ts knows to connect to /api
const api = new Hono<{
  Variables: {
    user: User | null;
    session: Session | null;
    userId: string;
  };
}>();

// Request logging middleware
api.use("*", async (c, next) => {
  const startTime = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const url = c.req.url;
  const userAgent = c.req.header("user-agent") || "unknown";
  const origin = c.req.header("origin") || "unknown";
  
  console.log(`[${method}] ${path}`, {
    method,
    path,
    url,
    origin,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  await next();

  const duration = Date.now() - startTime;
  const status = c.res.status;
  
  console.log(`[${method}] ${path} ${status}`, {
    method,
    path,
    status,
    statusText: c.res.statusText,
    duration: `${duration}ms`,
  });
});

api.get(
  "/health",
  describeRoute({
    summary: "Health check",
    description: "Check if the API is running",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: resolver(z.object({ status: z.string() })),
          },
        },
      },
    },
  }),
  (c) => {
    return c.json({ status: "ok" });
  },
);

// OpenAPI spec endpoint - automatically generates spec from routes with describeRoute
api.get(
  "/openapi",
  openAPIRouteHandler(api, {
    documentation: {
      openapi: "3.1.0",
      info: {
        title: "Kaneo API",
        version: "1.0.0",
        description: "API specification for Kaneo",
      },
      servers: [
        {
          url: process.env.KANEO_API_URL
            ? `${process.env.KANEO_API_URL}/api`
            : "http://localhost:1337/api",
          description: "API Server",
        },
      ],
    },
  }),
);

const configRoute = api.route("/config", config);

const githubIntegrationRoute = api.route(
  "/github-integration",
  githubIntegration,
);

const publicProjectRoute = api.get(
  "/public-project/:id",
  describeRoute({
    summary: "Get public project",
    description: "Get a public project by ID (no authentication required)",
    responses: {
      200: {
        description: "Public project details",
        content: {
          "application/json": {
            schema: resolver(
              z.object({
                id: z.string(),
                name: z.string(),
                icon: z.string(),
                slug: z.string(),
                description: z.string().nullable(),
                isPublic: z.boolean(),
                columns: z.array(
                  z.object({
                    id: z.string(),
                    name: z.string(),
                    position: z.number(),
                    tasks: z.array(z.any()),
                  }),
                ),
              }),
            ),
          },
        },
      },
      404: {
        description: "Project not found",
      },
      403: {
        description: "Project is not public",
      },
    },
  }),
  async (c) => {
    const { id } = c.req.param();
    const project = await getPublicProject(id);
    return c.json(project);
  },
);

// Document auth endpoints for OpenAPI spec
// These routes proxy to Better Auth's handler but are documented for OpenAPI
const sessionResponseSchema = z.object({
  data: z.object({
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      emailVerified: z.boolean(),
      image: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }).nullable(),
    session: z.object({
      id: z.string(),
      userId: z.string(),
      expiresAt: z.string(),
      token: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      ipAddress: z.string().nullable(),
      userAgent: z.string().nullable(),
      activeOrganizationId: z.string().nullable(),
      activeTeamId: z.string().nullable(),
    }).nullable(),
  }).nullable(),
});

api.get(
  "/auth/get-session",
  describeRoute({
    summary: "Get session",
    description: "Get the current user session. Returns user and session data if authenticated, null otherwise.",
    responses: {
      200: {
        description: "Session data",
        content: {
          "application/json": {
            schema: resolver(sessionResponseSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    // Proxy to Better Auth handler
    const response = await auth.handler(c.req.raw);
    return response;
  },
);

api.on(["POST", "GET", "PUT", "DELETE"], "/auth/*", (c) =>
  auth.handler(c.req.raw),
);

api.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user || null);
  c.set("session", session?.session || null);
  c.set("userId", session?.user?.id || "");

  if (!session?.user) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  return next();
});

// Global error handler for API routes
api.onError((err, c) => {
  const path = c.req.path;
  const method = c.req.method;
  
  console.error(`[${method}] ${path} - Error:`, err);
  
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  
  // Log full error details in development
  if (process.env.NODE_ENV !== "production") {
    console.error("Error stack:", err.stack);
    console.error("Error details:", err);
  }
  
  return c.json(
    { error: err.message || "Internal server error" },
    500,
  );
});

// Global error handler for main app (non-API routes)
app.onError((err, c) => {
  const path = c.req.path;
  const method = c.req.method;
  
  console.error(`[${method}] ${path} - Error:`, err);
  
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  
  // Log full error details in development
  if (process.env.NODE_ENV !== "production") {
    console.error("Error stack:", err.stack);
    console.error("Error details:", err);
  }
  
  return c.json(
    { error: err.message || "Internal server error" },
    500,
  );
});

const elseRoute = api.route("/else", elseRoutes);
const modsRoute = api.route("/mods", mods);
const projectRoute = api.route("/project", project);
const taskRoute = api.route("/task", task);
const activityRoute = api.route("/activity", activity);
const timeEntryRoute = api.route("/time-entry", timeEntry);
const labelRoute = api.route("/label", label);
const notificationRoute = api.route("/notification", notification);
const searchRoute = api.route("/search", search);

// Mount API routes under /api
app.route("/api", api);

(async () => {
  try {
    await migrateWorkspaceUserEmail();

    console.log("🔄 Migrating database...");
    await migrate(db, {
      migrationsFolder: `${process.cwd()}/drizzle`,
    });
    console.log("✅ Database migrated successfully!");
  } catch (error) {
    console.error("❌ Database migration failed!", error);
    process.exit(1);
  }
})();

const port = Number(process.env.PORT) || 1337;

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    const url = process.env.KANEO_API_URL || `http://localhost:${port}`;
    console.log(`⚡ API is running at ${url}`);
  },
);

export type AppType =
  | typeof elseRoute
  | typeof modsRoute
  | typeof projectRoute
  | typeof taskRoute
  | typeof activityRoute
  | typeof timeEntryRoute
  | typeof labelRoute
  | typeof notificationRoute
  | typeof searchRoute
  | typeof publicProjectRoute
  | typeof githubIntegrationRoute
  | typeof configRoute;

export default app;
