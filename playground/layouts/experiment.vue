<template>
  <NuxtLayout name="default">
    <main id="experiment-container">
      <slot />
    </main>
  </NuxtLayout>
</template>

<script setup lang="ts">
</script>

<style>
main#experiment-container {
  @apply mx-auto;
  @apply max-w-[48rem] w-full;
}
</style>
