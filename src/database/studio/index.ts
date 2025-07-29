import { type ChildProcess, spawn } from "node:child_process";
import { extendRouteRules } from "@nuxt/kit";
import { dirname } from "pathe";
import type { SmileBuildConfig } from "../../types/build-config";

export const spawnDrizzleStudio = async (buildConfig: SmileBuildConfig) => {
  if (!buildConfig.nuxt.options.dev) return;

  const studioPort = buildConfig.nuxt.options.smile.database?.studio.port ?? 7646;

  const root = buildConfig.paths.database;

  // extendPages((pages: NuxtPage[]) => {
  //   pages.unshift({
  //     name: "drizzle-studio",
  //     path: "/studio",
  //     file: resolve("../../runtime/pages/studio.vue"),
  //     meta: {
  //       devOnly: true,
  //     }
  //   });
  // })

  extendRouteRules("/studio", {
    redirect: `https://local.drizzle.studio?port=${studioPort}`,
  });

  let studioProcess: ChildProcess | undefined;

  buildConfig.nuxt.hook("listen", async () => {
    studioProcess = spawn("npx", ["drizzle-kit", "studio", "--port", `${studioPort}`], {
      cwd: root,
      stdio: "inherit",
    });
  });

  buildConfig.nuxt.hook("close", async () => {
    studioProcess?.kill();
  });
};
