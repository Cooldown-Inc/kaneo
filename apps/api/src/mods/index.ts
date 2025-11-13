import { Hono } from "hono";
import getAvailableMods from "./controllers/get-available-mods";

const mods = new Hono().get("/available", getAvailableMods);

export default mods;

