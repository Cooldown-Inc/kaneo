import { serve } from "@hono/node-server";
import type { Session, User } from "better-auth/types";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import activity from "./activity";
import { auth } from "./auth";
import config from "./config";
import db from "./database";
import githubIntegration from "./github-integration";
import label from "./label";

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
    if (!originMatch) {
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
      if (!corsOrigins) {
        return origin || "*";
      }

      if (!origin) {
        return null;
      }

      // Check for exact match or wildcard pattern match
      for (const pattern of corsOrigins) {
        if (matchesCorsOrigin(origin, pattern)) {
          return origin;
        }
      }

      return null;
    },
  }),
);

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

api.get("/health", (c) => {
  return c.json({ status: "ok" });
});

const configRoute = api.route("/config", config);

const githubIntegrationRoute = api.route(
  "/github-integration",
  githubIntegration,
);

const publicProjectRoute = api.get("/public-project/:id", async (c) => {
  const { id } = c.req.param();
  const project = await getPublicProject(id);

  return c.json(project);
});

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

serve(
  {
    fetch: app.fetch,
    port: 1337,
  },
  () => {
    console.log(
      `⚡ API is running at ${process.env.KANEO_API_URL || "http://localhost:1337"}`,
    );
  },
);

export type AppType =
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
