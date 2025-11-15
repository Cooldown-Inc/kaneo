import { client } from "@/lib/client";

async function clearNotifications() {
  const response = await client.notification["clear-all"].$delete();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default clearNotifications;
