import { config } from "dotenv-mono";
import { type Config, defineConfig } from "drizzle-kit";

// Only load .env files in development (Heroku provides env vars directly)
if (process.env.NODE_ENV !== "production") {
  config();
}

// Determine if we need SSL based on environment
// Heroku Postgres URLs contain amazonaws.com or heroku domains
const needsSSL = process.env.DATABASE_URL && 
  (process.env.DATABASE_URL.includes('amazonaws.com') || 
   process.env.DATABASE_URL.includes('heroku'));

export default defineConfig({
  out: "./drizzle",
  schema: "./src/database/schema.ts",
  dialect: "postgresql",
  dbCredentials: process.env.DATABASE_URL
    ? {
        url: needsSSL 
          ? `${process.env.DATABASE_URL}?sslmode=require`
          : process.env.DATABASE_URL,
      }
    : {
        url: "postgresql://kaneo_user:kaneo_password@localhost:5432/kaneo",
      },
}) satisfies Config;
