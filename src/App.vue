<template>
  <div class="layout-wrapper layout-static">
    <Toast />
    <div v-if="loading" class="flex flex-row justify-content-center align-items-center loading-container">
      <ProgressSpinner />
    </div>
    <router-view v-else />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ProgressSpinner from "primevue/progressspinner";
import store from "@/store/index";

let loading = ref(false);

onMounted(async () => {
  loading.value = true;
  await store.dispatch("authenticateCurrentUser");
  await store.dispatch("fetchFilterSettings");
  loading.value = false;
});

</script>

<style>
body {
  overflow: hidden;
}

.loading-container {
  width: 100vw;
  height: 100vh;
}

.p-toast-message-text {
  width: calc(100% - 4rem);
}

.p-toast-message-content {
  width: 100%;
}

.p-toast-detail {
  width: 100%;
  word-wrap: break-word;
}

.swal-reset-button {
  color: #212529 !important;
}
</style>
