<template>
  <NuxtLayout name="experiment">
    <h1> Go No Go </h1>
    <GoNoGo :stimulus="stimulus" />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { type GoNoGoStimulus } from '~/components/GoNoGo.vue';

const stimuli: GoNoGoStimulus[] = [
  { image: "/images/blue.png"  , go: true , },
  { image: "/images/orange.png", go: false, },
  { image: "/images/blue.png"  , go: true , },
  { image: "/images/orange.png", go: false, },
]

const { params } = useRoute()
console.assert(parseInt(params.stimuli) <= stimuli.length)

const stimulus = stimuli[parseInt(params.stimuli) - 1]

const keys = useMagicKeys()
const A = keys["a"]
whenever(A, () => {
  console.log(`whenever:: congruent`)
})
</script>
