<template>
  <div class="flanker">
    <template v-for="(arrow, index) in stimulus.text.split('')" :key="index">
      <Icon
        :name="`fa6-solid:arrow-${arrow == '<' ? 'left' : 'right'}`"
        aria-hidden="false"
        :ariaLabel="`${arrow == '<' ? `Left` : `Right`} Arrow`" />
    </template>
  </div>
</template>

<script setup lang="ts">
export type FlankerStimulus = {
  text: string;
  type: `congruent` | `incongruent`;
};

const props = defineProps<{
  stimulus: FlankerStimulus;
}>();
</script>

<style scoped>
.flanker {
  @apply inline-flex gap-2;
  @apply text-4xl;
  @apply w-full justify-center;
  @apply py-12;
}
</style>
