import type { Context } from "hono";

async function getAvailableMods(c: Context) {
  // Hard-coded mods for now
  const mods = [
    {
      id: "calendar",
      title: "Calendar 2",
    },
    {
      id: "analytics",
      title: "Analytics",
    },
  ];

  return c.json(mods);
}

export default getAvailableMods;

