<template>
  <div class="gonogo">
    <NuxtImg :src="stimulus.image" />
  </div>
</template>

<script setup lang="ts">
export type GoNoGoStimulus = {
  image: string;
  go: boolean;
}

const props = defineProps<{
  stimulus: GoNoGoStimulus
}>()
</script>

<style scoped>
.gonogo {
  @apply inline-flex gap-2;
  @apply text-4xl;
  @apply w-full justify-center;
  @apply py-12;
}
</style>
