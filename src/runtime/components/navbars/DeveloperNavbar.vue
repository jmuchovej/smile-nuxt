<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { NuxtLink, Icon, USelectMenu, UNavigationMenu, UContainer } from "#components";
import type { NavigationMenuItem, ContainerProps, SelectMenuProps } from "@nuxt/ui";
import { useAppConfig, navigateTo, useRuntimeConfig } from "#imports";

const resetLocalState = () => {};
const route = useRoute();

type RouteOption = {
  value: string;
  label: string;
  icon?: string;
};

type UsefulLink = {
  href: string;
  icon: string;
  label: string;
};

const si = "simple-icons";
const usefulLinks: NavigationMenuItem[] = [
  { icon: `i-${si}-github`, to: "https://github.com/nyuccl/smile", label: "Smile GitHub" },
  { icon: `i-${si}-nuxtdotjs`, to: "https://nuxt.com", label: "Nuxt" },
  { icon: `i-${si}-nuxtdotjs`, to: "https://nuxt.com/docs/guide", label: "Get Started with Nuxt" },
  { icon: `i-${si}-vuedotjs`, to: "https://vuejs.org", label: "VueJS" },
  { icon: `i-${si}-vuedotjs`, to: "https://play.vuejs.org", label: "VueJS Playground" },
  { icon: `i-${si}-tailwindcss`, to: "https://tailwindcss.com", label: "TailwindCSS (CSS Framework)" },
  { icon: `i-${si}-daisyui`, to: "https://daisyui.com", label: "DaisyUI (Prebuilt Components)" },
  { icon: `i-${si}-iconify`, to: "https://icon-sets.iconify.design", label: "Iconify (Icons)" },
  { icon: `i-system-uicons-wifi-error`, to: "https://internetingishard.netlify.app/", label: "Interneting is Hard" },
  { icon: `i-${si}-javascript`, to: "https://javascript.info/", label: "The Modern JavaScript Tutorial" },
  { icon: `i-${si}-typescript`, to: "https://typescriptlang.org/", label: "TypeScript (learn JavaScript first!)" },
];

const open = ref(true);

const config = useAppConfig();
const directRoute = ref<RouteOption | null>(null);
const activeExperiment = ref(config.smile.activeExperiment);
const availableExperiments = ref(config.smile.availableExperiments);

// Generate experiment-specific routes from the hierarchical tree structure
const routes = computed(() => {
  if (!activeExperiment.value) {
    return [];
  }

  // Get timeline data which includes the route tree
  const timelines = config.smile.timelines || {};
  const timeline = timelines[activeExperiment.value];

  if (!timeline?.routeTree) {
    return [];
  }

  // Convert route tree to grouped dropdown structure
  const routeGroups = buildRouteGroups(timeline.routeTree);

  return routeGroups;
});

const timelineRoute = computed(() => `/experiment/${activeExperiment.value}/_timeline`);

// Build grouped route structure from tree
function buildRouteGroups(nodes: any[], parentPath = ""): any[] {
  const groups: any[] = [];
  let addedSection = false;

  for (const node of nodes) {
    if (!node.fullPath && node.children?.length == 0) continue;

    if (node.isDirectory && node.children?.length > 0) {
      // Directory becomes a group
      const children = buildRouteItems(node.children, node.path);

      if (children.length === 0) continue;
      if (groups.slice(-1)[0]?.type == "separator") groups.pop();

      groups.push({ type: "separator" });
      groups.push({
        type: "label",
        label: formatGroupLabel(node.name, node.canRandomizeChildren),
      });
      groups.push(...children);
      groups.push({ type: "separator" });
    } else {
      // Single file at root level - create ungrouped item
      groups.push({
        value: node.fullPath,
        label: formatItemLabel(node.name),
        icon: getIconForNode(node),
      });
    }
  }

  return groups;
}

// Build route items (non-grouped) - include ALL navigable pages
function buildRouteItems(nodes: any[], basePath = ""): any[] {
  const items: any[] = [];

  for (const node of nodes) {
    if (!node.fullPath && node.children?.length == 0) continue;

    if (node.isDirectory && node.children?.length > 0) {
      // Nested directory - recursively add all children
      items.push(...buildRouteItems(node.children, node.path));
    } else if (!node.isDirectory) {
      // Check if this is a dynamic route that needs expansion
      if (node.name.includes("[") && node.name.includes("]")) {
        // Dynamic route - expand it to concrete routes
        const expandedRoutes = expandDynamicRoute(node);
        items.push(...expandedRoutes);
      } else {
        // Static route - add as-is
        items.push({
          value: node.fullPath,
          label: formatItemLabel(node.name),
          icon: getIconForNode(node),
        });
      }
    }
  }

  return items;
}

// Expand dynamic routes based on route patterns and experiment schema
function expandDynamicRoute(node: any): any[] {
  const items: any[] = [];

  // Extract all dynamic parameters from the route pattern
  const paramMatches = node.path.match(/(:\w+)/g);
  if (!paramMatches) {
    // No dynamic parameters - shouldn't happen, but handle gracefully
    console.log(node.path);
    items.push({
      value: node.fullPath,
      label: `${formatItemLabel(node.name)} (no params)`,
      icon: getIconForNode(node),
    });
    return items;
  }

  // Extract parameter names (remove brackets)
  const paramNames = paramMatches.map((match) => match.slice(1));

  // Get possible values for each parameter from experiment data
  const paramValues = getParameterValues(activeExperiment.value, paramNames);

  // Generate all combinations of parameter values
  const combinations = generateParameterCombinations(paramValues);

  // Create a route for each combination
  for (const combination of combinations) {
    let concretePath = node.path;
    let concreteFullPath = node.fullPath;
    let label = "";

    // Replace each parameter with its concrete value
    for (let i = 0; i < paramNames.length; i++) {
      const paramName = paramNames[i];
      const paramValue = combination[i];
      const paramPattern = `:${paramName}`;

      concretePath = concretePath.replace(paramPattern, paramValue.toString());
      concreteFullPath = concreteFullPath?.replace(paramPattern, paramValue.toString());

      // Build human-readable label
      if (label) label += " / ";
      label += formatParameterLabel(paramName, paramValue);
    }

    items.push({
      value: concreteFullPath || `/experiment/${activeExperiment.value}${concretePath}`,
      label: label,
      icon: "i-ph-play-circle-bold",
    });
  }

  return items;
}

// Get possible values for parameters based on experiment schema and data
function getParameterValues(experimentName: string, paramNames: string[]): any[][] {
  const paramValues: any[][] = [];

  for (const paramName of paramNames) {
    if (paramName === "index") {
      // For index parameter, use stimulus indices
      const stimuliCount = getStimuliCount(experimentName);
      paramValues.push(Array.from({ length: stimuliCount }, (_, i) => i));
    } else {
      // For other parameters, we'd need to look at the schema
      // For now, provide a single placeholder value
      console.warn(`Unknown parameter: ${paramName}, using placeholder`);
      paramValues.push(["unknown"]);
    }
  }

  return paramValues;
}

// Generate all combinations of parameter values (cartesian product)
function generateParameterCombinations(paramValues: any[][]): any[][] {
  if (paramValues.length === 0) return [[]];
  if (paramValues.length === 1) return paramValues[0].map((v) => [v]);

  const result: any[][] = [];
  const [first, ...rest] = paramValues;
  const restCombinations = generateParameterCombinations(rest);

  for (const firstValue of first) {
    for (const restCombination of restCombinations) {
      result.push([firstValue, ...restCombination]);
    }
  }

  return result;
}

// Format parameter labels for display
function formatParameterLabel(paramName: string, paramValue: any): string {
  if (paramName === "index") {
    return `Stimulus ${paramValue}`;
  }
  return `${paramName}: ${paramValue}`;
}

// Get the number of stimuli for an experiment by fetching from API
function getStimuliCount(experimentName: string): number {
  // This should ideally be async, but for now we'll return a default
  // The dropdown will update when the actual count is fetched

  // For now, return a placeholder while we fetch the real count
  // In a real implementation, we'd want to cache these counts or make this async
  return 10; // Placeholder - will be replaced with API call
}

// Format group labels with indicators
function formatGroupLabel(name: string, canRandomize: boolean): string {
  const cleanName = name.replace(/^\d+\./, ""); // Remove numeric prefix
  const icon = canRandomize ? "🎲" : "📋";
  return `${icon} ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
}

// Format item labels
function formatItemLabel(name: string): string {
  return name.replace(/^\d+\./, "").replace(/\.\w+$/, ""); // Remove numeric prefix and extension
}

// Get icon for tree node
function getIconForNode(node: any): string {
  if (node.fileType === "mdx") return "i-ph-file-text-bold";
  if (node.fileType === "vue") return "i-ph-code-bold";

  // Fallback based on name patterns
  const name = node.name.toLowerCase();
  if (name.includes("consent")) return "i-ph-handshake-bold";
  if (name.includes("instruction")) return "i-ph-book-open-bold";
  if (name.includes("stimuli") || name.includes("trial")) return "i-ph-play-circle-bold";
  if (name.includes("debrief")) return "i-ph-check-circle-bold";

  return "i-ph-file-bold";
}

// Handle route navigation
const handleRouteChange = (option: RouteOption | null) => {
  if (option?.value) {
    navigateTo(option.value);
    directRoute.value = null; // Reset selection after navigation
  }
};

const uiExperiment = {
  placeholder: "Current Experiment",
  icon: "i-ph-microscope-bold",
  variant: "subtle",
  ui: {
    base: "w-full",
  },
} satisfies SelectMenuProps;

const uiJumpTo = {
  placeholder: "Jump to...",
  icon: "i-ph-rainbow-bold",
  variant: "subtle",
  ui: {
    base: "w-full",
  },
} satisfies SelectMenuProps;

const uiContainer = {
  class: "w-min max-w-(--ui-container) mx-0 p-4 sm:p-6 lg:p-8 min-w-xs bg-slate-200 flex flex-col gap-y-4",
} satisfies ContainerProps;

const devBarBrand = {
  class: "mx-0 text-3xl flex flex-row gap-2 items-center pb-4",
} satisfies ContainerProps;
</script>

<template>
  <UContainer v-bind='uiContainer'>
    <UContainer as="div" v-bind="devBarBrand">
      <!-- <Icon name="fluent-emoji-flat:melting-face" /> -->
      <Icon name="ph-smiley-melting-bold" />
      SmileJS
    </UContainer>

    <UButtonGroup size="xl" orientation="horizontal" class="w-full">
      <UButton variant="subtle" color="error" label="Reset" icon="i-ph-arrow-counter-clockwise-bold"
        :alt="'Reset all state and return to homepage'" class="grow" @click="resetLocalState()" />

      <UButton variant="subtle" :color="route == '/config' ? 'primary' : 'neutral'" label="Config"
        icon="i-ph-gear-fine-bold" :alt="'View Smile configuration'" class="grow" to="/config" />

      <UButton variant="subtle" :color="route == timelineRoute.value ? 'primary' : 'neutral'" label="Timeline"
        icon="i-ph-steps-bold" :alt="`View the Timeline for ${activeExperiment.value}`" class="grow"
        :to="timelineRoute" />
    </UButtonGroup>

    <USelectMenu v-model="activeExperiment" :items="availableExperiments" v-bind="uiExperiment" />

    <USelectMenu v-model="directRoute" :items="routes" :search-input="true" @update:model-value="handleRouteChange"
      v-bind="uiJumpTo" />

    <UNavigationMenu orientation="vertical"
      :items="[{ 'label': 'Useful Links', icon: 'i-ph-lego-smiley-bold', children: usefulLinks }]" />
  </UContainer>
</template>

<style lang="css">
@reference "@/assets/css/main.css";

#developer-navbar {
  @apply py-4 sm:py-6 lg:py-8;
  @apply min-w-xs;
  @apply bg-slate-200;
  @apply flex flex-col gap-y-4;

  #devbar-brand {
    @apply text-3xl;
    @apply flex flex-row gap-2;
    @apply items-center;
    @apply pb-4;
  }
}
</style>
