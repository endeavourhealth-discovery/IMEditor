<template>
  <div class="layout-wrapper layout-static">
    <Toast />
    <ReleaseNotes v-if="!loading" :appVersion="appVersion" repositoryName="IMEditor" />
    <div v-if="loading" class="flex flex-row justify-content-center align-items-center loading-container">
      <ProgressSpinner />
    </div>
    <router-view v-else />
  </div>
</template>

<script setup lang="ts">
import { onMounted, provide, ref } from "vue";
import ProgressSpinner from "primevue/progressspinner";
import { useStore } from "vuex";
import { useToast } from "primevue/usetoast";
import axios from "axios";
import { Auth } from "aws-amplify";
import { Helpers, Services } from "im-library";
import { useRoute, useRouter } from "vue-router";
const { Env } = Services;
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;

setupAxiosInterceptors();
setupExternalErrorHandler();

provide("axios", axios);

const appVersion = __APP_VERSION__;

const toast = useToast();
const router = useRouter();
const route = useRoute();
const store = useStore();

let loading = ref(false);

onMounted(async () => {
  loading.value = true;
  await store.dispatch("authenticateCurrentUser");
  await store.dispatch("fetchFilterSettings");
  loading.value = false;
});

function setupAxiosInterceptors() {
  axios.interceptors.request.use(async (request: any) => {
    if (store.state.isLoggedIn && Env.API && request.url?.startsWith(Env.API)) {
      request.headers.Authorization = "Bearer " + (await Auth.currentSession()).getIdToken().getJwtToken();
    }
    return request;
  });

  axios.interceptors.response.use(
    response => {
      return isObjectHasKeys(response, ["data"]) ? response.data : undefined;
    },
    error => {
      if (error.response.status.toString().charAt(0) === "4") {
        if (error.response.status === 403) {
          toast.add({
            severity: "error",
            summary: "Access denied",
            detail: "Login required for " + error.config.url.substring(error.config.url.lastIndexOf("/") + 1) + "."
          });
          window.location.href = Env.AUTH_URL + "login?returnUrl=" + route.fullPath;
        } else if (error.response.status === 401) {
          toast.add({
            severity: "error",
            summary: "Access denied",
            detail:
              "Insufficient clearance to access " +
              error.config.url.substring(error.config.url.lastIndexOf("/") + 1) +
              ". Please contact an admin to change your account security clearance if you require access to this resource."
          });
          router.push({ name: "AccessDenied" });
        } else {
          toast.add({
            severity: "warn",
            summary: "Warning",
            detail:
              "Request for " + error.config.url.substring(error.config.url.lastIndexOf("/") + 1) + " was unsuccessful. " + error.response.data.message + ".",
            life: 4000
          });
          console.warn(
            error.config.url +
              " :" +
              "\n\t" +
              "Status: " +
              error.response.data.status +
              "\n\t" +
              "Code: " +
              error.response.data.code +
              "\n\t" +
              "Timestamp: " +
              error.response.data.timestamp +
              "\n\t" +
              "Message: " +
              error.response.data.message
          );
        }
      } else {
        toast.add({
          severity: "error",
          summary: "Request error",
          detail:
            "Request for " + error.config.url.substring(error.config.url.lastIndexOf("/") + 1) + " was unsuccessful. " + error.response.data.message + ".",
          life: 4000
        });
        console.error(
          error.config.url +
            " :" +
            "\n\t" +
            "Status: " +
            error.response.data.status +
            "\n\t" +
            "Code: " +
            error.response.data.code +
            "\n\t" +
            "Timestamp: " +
            error.response.data.timestamp +
            "\n\t" +
            "Message: " +
            error.response.data.message
        );
      }
    }
  );
}

function setupExternalErrorHandler() {
  window.addEventListener("unhandledrejection", e => {
    e.preventDefault();
    console.error(e);
    if (e.reason?.response?.data?.title)
      toast.add({
        severity: "error",
        summary: e.reason.response.data.title,
        detail: e.reason.response.data.detail
      });
    else if (e.reason?.name)
      toast.add({
        severity: "error",
        summary: e.reason.name,
        detail: e.reason.message
      });
    else
      toast.add({
        severity: "error",
        summary: "An error occurred",
        detail: e.reason
      });
  });
}
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
