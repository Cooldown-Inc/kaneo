import type { client } from "@/lib/client";
import type { InferResponseType } from "hono/client";

export type Project = Extract<
  InferResponseType<(typeof client)["project"][":id"]["$get"], 200>,
  { id: string }
>;

export type ProjectWithTasks = Extract<
  InferResponseType<
    (typeof client)["task"]["tasks"][":projectId"]["$get"],
    200
  >,
  { id: string }
>;
