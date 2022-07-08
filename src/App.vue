<template>
  <div class="layout-wrapper layout-static">
    <Toast />
    <div v-if="loading" class="flex flex-row justify-content-center align-items-center loading-container">
      <ProgressSpinner />
    </div>
    <router-view v-else />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import ProgressSpinner from "primevue/progressspinner";
import AuthService from "@/services/AuthService";

export default defineComponent({
  name: "App",
  components: { ProgressSpinner: ProgressSpinner },
  provide() {
    return {
      userRoles: computed(() => this.userRoles)
    };
  },
  async mounted() {
    // check for user and log them in if found or logout if not
    this.loading = true;
    await this.$store.dispatch("authenticateCurrentUser");
    await this.$store.dispatch("fetchFilterSettings");
    const roles = await AuthService.getRoles();
    if (roles) this.userRoles = roles;
    this.loading = false;
  },
  data() {
    return {
      loading: false,
      userRoles: [] as string[]
    };
  }
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
