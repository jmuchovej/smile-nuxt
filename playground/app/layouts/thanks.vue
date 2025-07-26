<template>
  <NuxtLayout name="default">
    <div class="prose mx-auto">
      <h1> Thank you! </h1>

      <div class="payment">
        <h1><slot name="header" /></h1>
        <p class="pb-5">
          <slot />
        </p>
        <slot name="completion-code" />
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
</script>

<style>
.payment {
  width: 60%;
  margin: auto;
}

.completion-code {
  font-size: 1.5em;
  font-weight: bold;
  margin-right: 20px;
  padding: 10px;
  border: 1px solid #cccccc;
}
</style>
