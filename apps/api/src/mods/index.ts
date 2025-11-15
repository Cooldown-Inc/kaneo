import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import { z } from "zod";
import getAvailableMods from "./controllers/get-available-mods";
import getModBundle from "./controllers/get-mod-bundle";

const modSchema = z.object({
  id: z.string(),
  title: z.string(),
});

const mods = new Hono()
  .get(
    "/available",
    describeRoute({
      summary: "Get available mods",
      description: "Returns a list of available mods",
      responses: {
        200: {
          description: "List of available mods",
          content: {
            "application/json": {
              schema: resolver(z.array(modSchema)),
            },
          },
        },
      },
    }),
    getAvailableMods,
  )
  .get(
    "/:modId/bundle",
    describeRoute({
      summary: "Get mod bundle URL",
      description: "Fetches the bundle URL for a mod from Else API",
      responses: {
        200: {
          description: "Bundle URL",
          content: {
            "application/json": {
              schema: resolver(
                z.object({
                  bundleUrl: z.string().nullable(),
                }),
              ),
            },
          },
        },
      },
    }),
    getModBundle,
  );

export default mods;

