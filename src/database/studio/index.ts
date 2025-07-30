import { type ChildProcess, spawn } from "node:child_process";
import { extendRouteRules } from "@nuxt/kit";
import { useLogger } from "../../utils/module";
import type { SmileBuildConfig } from "../../types/build-config";

export const spawnDrizzleStudio = async (buildConfig: SmileBuildConfig) => {
  if (!buildConfig.nuxt.options.dev) return;
  const logger = useLogger("database", "studio");

  // TODO Explore whether it's possible to wrap `drizzle-studio` in an iFrame equivalent
  extendRouteRules("/studio", {
    redirect: `https://local.drizzle.studio`,
  });

  let studioProcess: ChildProcess | undefined;

  buildConfig.nuxt.hook("listen", async () => {
    logger.info("Spawning `drizzle-studio` process");
    studioProcess = spawn("npx", ["drizzle-kit", "studio"], {
      cwd: buildConfig.paths.database,
      stdio: "inherit",
    });
  });

  buildConfig.nuxt.hook("close", async () => {
    logger.info("Killing `drizzle-studio` process");
    studioProcess?.kill();
  });
};
