import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import getSettings from "../utils/get-settings";

const settingsSchema = z.object({
  disableRegistration: z.boolean(),
  isDemoMode: z.boolean(),
  hasSmtp: z.boolean(),
  hasGithubSignIn: z.boolean(),
  hasGoogleSignIn: z.boolean(),
});

const config = new Hono().get(
  "/",
  describeRoute({
    summary: "Get config",
    description: "Get application configuration settings",
    responses: {
      200: {
        description: "Configuration settings",
        content: {
          "application/json": {
            schema: resolver(settingsSchema),
          },
        },
      },
    },
  }),
  async (c) => {
    const settings = getSettings();
    return c.json(settings);
  },
);

export default config;
