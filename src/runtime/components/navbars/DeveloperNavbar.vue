<script lang="ts">
import { NuxtLink } from "#app";
import { defineComponent } from "#imports";
import { Icon } from "@nuxt/icon";
// import { Icon } from "#imports";

const resetLocalState = () => {}

type UsefulLink = {
  href: string;
  icon: string;
  text: string
}

export default defineComponent({
  setup (props, { emit }) {
    const routes = []

    const si = "simple-icons"
    const usefulLinks: UsefulLink[] = [
      { icon: `${si}:github`, href: "https://github.com/nyuccl/smile", text: "Smile GitHub" },
      { icon: `${si}:nuxtdotjs`, href: "https://nuxt.com", text: "Nuxt" },
      { icon: `${si}:nuxtdotjs`, href: "https://nuxt.com/docs/guide", text: "Get Started with Nuxt" },
      { icon: `${si}:vuedotjs`, href: "https://vuejs.org", text: "VueJS" },
      { icon: `${si}:vuedotjs`, href: "https://play.vuejs.org", text: "VueJS Playground" },
      { icon: `${si}:tailwindcss`, href: "https://tailwindcss.com", text: "TailwindCSS (CSS Framework)" },
      { icon: `${si}:daisyui`, href: "https://daisyui.com", text: "DaisyUI (Prebuilt Components)" },
      { icon: `${si}:iconify`, href: "https://icon-sets.iconify.design", text: "Iconify (Icons)" },
      { icon: `system-uicons:wifi-error`, href: "https://internetingishard.netlify.app/", text: "Interneting is Hard", },
      { icon: `${si}:javascript`, href: "https://javascript.info/", text: "The Modern JavaScript Tutorial" },
      { icon: `${si}:typescript`, href: "https://typescriptlang.org/", text: "TypeScript (learn JavaScript first!)" },
    ]
    return { routes, usefulLinks }
  }
})
</script>

<template>
  <div class="navbar">
    <div class="navbar-start">
      <div class="navbar-title"><strong>developer mode</strong></div>
      <button class="nav-item"
        alt="Reset all state and return to homepage"
        @click="resetLocalState()">
        Reset <Icon name="fa6-solid:arrow-rotate-left" />
      </button>
      <NuxtLink to="/config" alt="View Smile configuration" class="nav-item">
        Config <Icon name="fa6-solid:gears" />
      </NuxtLink>
    </div>
    <div class="navbar-center">
      <!-- TODO allow toggling "Jumps" -->
      <label for="allow-jumps">
        <input id="allow-jumps" type="checkbox" class="toggle toggle-success" />
        Allow Jumps
      </label>
      <div class="dropdown">
        <div tabindex="0" role="button" alt="Jump to page" class="nav-item">
          Jump to <Icon name="fa6-solid:rainbow" />
        </div>
        <div tabindex="0" class="dropdown-content menu">
          <div class="divider m-0" />
          <NuxtLink v-for="route in routes" >
          </NuxtLink>
        </div>
      </div>
      <div class="divider divider-horizontal divider-neutral m-0"></div>
      <div class="dropdown">
        <div tabindex="0" role="button" alt="Skip sections" class="nav-item">
          <pre>taskOrder</pre> <Icon name="fa6-solid:rainbow" />
        </div>
        <div tabindex="0" class="dropdown-content menu">
          <div class="divider m-0" />
          <NuxtLink v-for="route in routes" >
          </NuxtLink>
        </div>
      </div>
    </div>
    <div class="navbar-end">
      <NuxtLink class="nav-item" alt="View Smile Documentation" href="https://smile.gureckislab.org" target="_new">
        Docs <Icon name="fa6-solid:book" />
      </NuxtLink>
      <div class="dropdown dropdown-end">
        <div tabindex="0" role="button" class="nav-item">
          Useful Links <Icon name="fa6-solid:face-laugh-beam" />
        </div>
        <ul tabindex="0" class="dropdown-content menu">
          <li class="dropdown-item" v-for="link in usefulLinks" :key="link.href">
            <a :href="link.href">
              <Icon :name="link.icon" /> {{ link.text }}
            </a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
.navbar {
  @apply w-full bg-accent text-accent-content;
  @apply justify-between;
  @apply min-h-8;

  .navbar-title {
    @apply uppercase;
  }

  .navbar-start, .navbar-center, .navbar-end {
    @apply gap-2;
  }

  label[for="allow-jumps"] {
    @apply inline-flex gap-1;
    @apply cursor-pointer;
  }

  .nav-item {
    @apply btn btn-sm;
    @apply bg-base-300 text-base-content;
    @apply shadow-none;
  }

  .dropdown-content {
    @apply bg-base-300 text-base-content;
    @apply rounded;
    @apply min-w-52 mt-1;
    @apply z-[1];
  }
}
</style>
