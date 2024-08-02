<template>
  <NuxtLayout name="experiment">
    <div class="page prose">
      <h1>Please help us understand the mind!</h1>
      <p>Take part in a short experiment where you play a game for money.</p>

      <NuxtLink to="/consent" class="btn btn-primary">
        I'm ready! <Icon name="fa6-solid:arrow-right" />
      </NuxtLink>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()

const { service } = route.params;

// Store URL parameters
await useFetch(`/api/welcome/${service}`, {
  query: route.query,
  responseType: `text`,
  method: `post`
})
</script>
