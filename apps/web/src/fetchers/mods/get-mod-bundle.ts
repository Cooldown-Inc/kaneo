import { client } from "@/lib/client";

export type GetModBundleResponse = {
  bundleUrl: string | null;
  error?: string;
};

async function getModBundle(modId: string): Promise<GetModBundleResponse> {
  const response = await client.mods[":modId"].bundle.$get({
    param: { modId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default getModBundle;

