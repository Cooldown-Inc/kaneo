import { Hono } from "hono";
import getAvailableMods from "./controllers/get-available-mods";
import getModBundle from "./controllers/get-mod-bundle";

const mods = new Hono()
  .get("/available", getAvailableMods)
  .get("/:modId/bundle", getModBundle);

export default mods;

