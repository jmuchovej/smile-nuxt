import type { ResolvedExperiment } from "./experiment"

// declare module '#smile/experiments' {
//   export const experiments: Record<string, unknown>
// }

declare module "@nuxt/schema" {
  interface RuntimeConfig {
    smile: SmileRuntimeConfig
  }
  interface PublicRuntimeConfig {
    smile: SmilePublicRuntimeConfig
  }
}

export interface SmileModuleOptions {
  database?: {
    type: "sqlite" | string,
    url: string;
  };
}

export interface SmileRuntimeConfig {
  activeExperiment: string;
  experiments: Record<string, ResolvedExperiment>;
  database: {
    path: string;
  }
}

export interface SmilePublicRuntimeConfig {
}

export interface SmileAppConfig {
  activeExperiment: string
  availableExperiments: string[]
}
