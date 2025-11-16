import { config } from "dotenv-mono";
import { type Config, defineConfig } from "drizzle-kit";

// Only load .env files in development (Heroku provides env vars directly)
if (process.env.NODE_ENV !== "production") {
  config();
}

export default defineConfig({
  out: "./drizzle",
  schema: "./src/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: process.env.DATABASE_URL
    ? {
        url: `${process.env.DATABASE_URL}?sslmode=require`,
      }
    : {
        url: "postgresql://kaneo_user:kaneo_password@localhost:5432/kaneo",
      },
}) satisfies Config;
