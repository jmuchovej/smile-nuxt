const schema = {
  $schema: {
    title: "Smile",
    description: "A face-meltingly good approach to online research."
  },
  mode: {
    $default: "development",
    $schema: {
      title: "Smile's Running Mode",
      description: "What mode are you running Smile in?",
      enum: ["development", "testing", "presentation", "production"],
    }
  },
  project: {
    $default: {
      name: "smile",
      ref: "smile-nonuniq-ref",
      // TODO have this autogenerate in a semi-reproducible way
      codename: "",
      // TODO see if it's possible to infer the Base URL from Nuxt?
      url: "",
    },
    $schema: {
      title: "Project Details",
      description: "Details about your project to help us generate unique IDs!",
      tsType: "{ name: string, ref: string, codename: string, url: string }"
    }
  },
  localStorageKey: {
    $default: "smile",
    $schema: {
      title: "Local Storage Key",
      description: "What key should be used to track local storage? This allows us to track state for individuals to ensure no repeats, no missed data, etc.",
      tsType: "string"
    }
  },
  git: {
    $default: {
      repo: "smile-nuxt",
      owner: "jmuchovej",
      branch: "main",
      last_commit: {
        message: undefined,
        sha: undefined,
        url: undefined,
      }
    },
    $schema: {
      title: "Git attributes",
      description: "What are the current Git attributes, so we can uniquely version each edition of the experiment?"
    }
  }
}

export default schema
