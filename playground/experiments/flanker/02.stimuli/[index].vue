<template>
  <NuxtLayout name="smile-default">
    <div class="container mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-4">Stroop Task</h1>

      <!-- Stimulus Info -->
      <div v-if="stimulusExists" class="bg-white rounded-lg shadow p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold">Stimulus {{ stimulusIndex }}</h2>
          <span class="text-sm text-gray-500">{{ stimulusIndex + 1 }} of {{ totalStimuli }}</span>
        </div>

        <!-- Stimulus Data Display -->
        <div v-if="stimulusData" class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-gray-50 p-3 rounded">
            <label class="text-sm font-medium text-gray-600">Word</label>
            <p class="text-lg font-bold">{{ stimulusData.word }}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded">
            <label class="text-sm font-medium text-gray-600">Color</label>
            <p class="text-lg font-bold" :style="{ color: stimulusData.color }">{{ stimulusData.color }}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded">
            <label class="text-sm font-medium text-gray-600">Type</label>
            <p class="text-lg">{{ stimulusData.type }}</p>
          </div>
          <div class="bg-gray-50 p-3 rounded">
            <label class="text-sm font-medium text-gray-600">Correct Response</label>
            <p class="text-lg font-bold">{{ stimulusData.correct }}</p>
          </div>
        </div>

        <!-- Actual Stroop Component -->
        <div class="border-t pt-6">
          <h3 class="text-md font-semibold mb-4">Stimulus Presentation</h3>
          <Stroop :stimulus="stimulusData" />
        </div>
      </div>

      <!-- Error State -->
      <div v-else class="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-red-800 mb-2">Stimulus Not Found</h2>
        <p class="text-red-700">No stimulus found for index {{ stimulusIndex }}</p>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between">
        <NuxtLink v-if="hasPrevious" :to="`/experiment/stroop/stimuli/${previousIndex}`"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
          ← Previous ({{ previousIndex }})
        </NuxtLink>
        <span v-else></span>

        <NuxtLink v-if="hasNext" :to="`/experiment/stroop/stimuli/${nextIndex}`"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Next ({{ nextIndex }}) →
        </NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useStimulus } from "#imports";

// Use the stimulus composable to get data for this route
const { stimulusIndex, stimulusData, stimulusExists, totalStimuli, hasNext, hasPrevious, nextIndex, previousIndex } =
  useStimulus("stroop");

// Log stimulus data for debugging
console.log("Stimulus Index:", stimulusIndex.value);
console.log("Stimulus Data:", stimulusData.value);
</script>
