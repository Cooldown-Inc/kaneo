import { client } from "@/lib/client";

export type AvailableMod = {
  id: string;
  title: string;
};

async function getAvailableMods(): Promise<AvailableMod[]> {
  const response = await client.mods.available.$get();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getAvailableMods;

