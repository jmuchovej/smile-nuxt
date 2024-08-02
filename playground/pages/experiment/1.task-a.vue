<template>
  <NuxtLayout name="experiment">
    <h1>Task 1</h1>
  </NuxtLayout>
</template>

<script setup lang="ts">
const { params } = useRoute()
console.log(params)
</script>
