<template>
  <NuxtLayout name="experiment">
    <h1> Flanker </h1>
    <Flanker :stimulus="stimulus" />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { type FlankerStimulus } from '~/components/Flanker.vue';

const stimuli: FlankerStimulus[] = [
  { text: `<<<<<`, type: `congruent`  },
  { text: `>>>>>`, type: `congruent`  },
  { text: `<<><<`, type: `incongruent`},
  { text: `>><>>`, type: `incongruent`},
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
