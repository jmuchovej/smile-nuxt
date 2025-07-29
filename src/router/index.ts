import type { SmileBuildConfig } from "../types/build-config";
import { addExperimentRoutes } from "./experiment";
import { addInternalRoutes } from "./internal";

export async function generateRoutingTable(config: SmileBuildConfig) {
  await addInternalRoutes(config);
  await addExperimentRoutes(config);
}
