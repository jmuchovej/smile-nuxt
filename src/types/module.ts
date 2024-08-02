// Module options TypeScript interface definition
export interface ModuleOptions {
  mode: "development" | "testing" | "presentation" | "production";

  project: {
    name: string | undefined;
    ref: string | undefined;
    codename: string | undefined;
    url: string | undefined;
  }

  localStorageKey: string;

  git: {
    repo: string | undefined;
    owner: string | undefined;
    branch: string | undefined;
    last_commit: {
      message: string | undefined;
      sha: string | undefined;
      url: string | undefined;
    }
  }
}

export interface SmileContext extends ModuleOptions {

}
