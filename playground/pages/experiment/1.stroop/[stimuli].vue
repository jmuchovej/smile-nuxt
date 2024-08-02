<template>
  <NuxtLayout name="experiment">
    <h1> Stroop </h1>
    <Stroop :stimulus="stimulus" />
  </NuxtLayout>
</template>

<script setup lang="ts">
const { params } = useRoute()
console.log(params)
</script>
