import type { Context } from "hono";

async function getAvailableMods(c: Context) {
  // Hard-coded mods for now
  const mods = [
    {
      id: "new-layout",
      title: "New Layout",
    },
    {
      id: "personal-space",
      title: "My Space",
    },
  ];

  return c.json(mods);
}

export default getAvailableMods;

