<template>
  <div id="topbar-query-container">
    <TopBar>
      <template #content>
        <div class="topbar-content">
          <span class="title"><strong>IM QueryBuilder:</strong></span>
        </div>
      </template>
    </TopBar>
    <ConfirmDialog></ConfirmDialog>
    <div id="query-main-container">
      <div class="loading-container" v-if="loading">
        <ProgressSpinner />
      </div>
      <div v-else class="content-buttons-container">
        <div class="content-json-container">
          <div class="content">
            <div class="panel-content" id="query-builder-container">
              <QueryBuilder :updatedQuery="queryUpdated" @query-updated="updateQuery" />
            </div>
          </div>
          <Divider v-if="showJson" layout="vertical" />
          <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>
            <VueJsonPretty v-if="isObjectHasKeys(queryUpdated)" class="json" :path="'res'" :data="queryUpdated" />
          </div>
          <Button
            class="p-button-rounded p-button-info p-button-outlined json-toggle"
            :label="showJson ? 'hide JSON' : 'show JSON'"
            @click="showJson = !showJson"
          />
        </div>
        <div class="button-bar" id="query-button-bar">
          <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="resetQuery" />
          <Button icon="pi pi-check" label="Save" class="save-button" @click="submit" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, reactive, computed, watch, provide, inject } from "vue";
import type { Ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import QueryBuilder from "@/components/query/QueryBuilder.vue";
import * as injectionKeys from "@/injectionKeys/injectionKeys";
import Swal from "sweetalert2";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import store from "@/store/index";
import { Helpers, Services, Vocabulary } from "im-library";
import _ from "lodash";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { QueryService, EntityService, Env, ConfigService, SetService } = Services;
const { IM } = Vocabulary;

export default defineComponent({
  name: "Query",
  components: { VueJsonPretty, QueryBuilder },
  setup() {
    const configService = new ConfigService(axios);
    const queryService = new QueryService(axios);
    const entityService = new EntityService(axios);
    const setService = new SetService(axios);
    const router = useRouter();
    const route = useRoute();

    provide(injectionKeys.$store, store);
    provide(injectionKeys.$router, router);
    provide(injectionKeys.$swal, Swal);
    provide(injectionKeys.$queryService, queryService);
    provide(injectionKeys.$env, Env);
    provide(injectionKeys.$entityService, entityService);
    provide(injectionKeys.$setService, setService);
    provide(injectionKeys.$configService, configService);
    provide(injectionKeys.$route, route);

    const userRoles = inject("userRoles");

    let loading = ref(true);
    onMounted(() => {
      loading.value = false;
    });

    let queryOriginal: any = ref({});

    let queryUpdated: any = ref({});
    watch(
      () => _.cloneDeep(queryUpdated.value),
      () => {
        toggleConfirmLeaveDialog();
      }
    );

    let showJson: Ref<boolean> = ref(true);

    const filterOptions = computed(() => store.state.filterOptions);

    async function getFilterOptions(): Promise<void> {
      if (!(isObjectHasKeys(filterOptions.value) && isArrayHasLength(filterOptions.value.schemes))) {
        const schemeOptions = await entityService.getNamespaces();
        const typeOptions = await entityService.getEntityChildren(IM.MODELLING_ENTITY_TYPE);
        const statusOptions = await entityService.getEntityChildren(IM.STATUS);
        store.commit("updateFilterOptions", {
          status: statusOptions,
          schemes: schemeOptions,
          types: typeOptions
        });
      }
    }
    onMounted(async () => {
      await getFilterOptions();
    });

    function toggleConfirmLeaveDialog() {
      if (checkForChanges()) {
        window.addEventListener("beforeunload", beforeWindowUnload);
      } else {
        window.removeEventListener("beforeunload", beforeWindowUnload);
      }
    }

    function beforeWindowUnload(e: any) {
      if (checkForChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    function updateQuery(data: any) {
      if (isArrayHasLength(data)) {
        data.forEach((item: any) => {
          if (isObjectHasKeys(item)) {
            for (const [key, value] of Object.entries(item)) {
              queryUpdated.value[key] = value;
            }
          }
        });
      }
    }

    function checkForChanges(): boolean {
      return !(JSON.stringify(queryOriginal.value) === JSON.stringify(queryUpdated.value));
    }

    async function submit(): Promise<void> {
      if (isValidQuery(queryUpdated.value)) {
        Swal.fire({
          icon: "info",
          title: "Confirm create",
          text: "Are you sure you want to create this entity?",
          showCancelButton: true,
          confirmButtonText: "Create",
          reverseButtons: true,
          confirmButtonColor: "#689F38",
          cancelButtonColor: "#607D8B",
          showLoaderOnConfirm: true,
          allowOutsideClick: () => !Swal.isLoading(),
          preConfirm: async () => {
            const res = await queryService.createQuery(queryUpdated);
            if (res) return res;
            else Swal.showValidationMessage("Error creating entity from server.");
          }
        }).then((result: any) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: "Success",
              text: "Query has been created.",
              icon: "success",
              showCancelButton: true,
              reverseButtons: true,
              confirmButtonText: "Open in Viewer",
              confirmButtonColor: "#2196F3",
              cancelButtonColor: "#607D8B"
            }).then((result: any) => {
              if (result.isConfirmed) {
                window.location.href = Env.QUERY_URL;
              } else {
                window.location.href = Env.DIRECTORY_URL;
              }
            });
          }
        });
      } else {
        console.log("invalid entity");
        Swal.fire({
          icon: "warning",
          title: "Warning",
          text: "Invalid values found. Please review your entries.",
          confirmButtonText: "Close",
          confirmButtonColor: "#689F38"
        });
      }
    }

    function isValidQuery(query: any): boolean {
      return true;
    }

    function resetQuery(): void {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "This action will reset all progress. Are you sure you want to proceed?",
        showCancelButton: true,
        confirmButtonText: "Reset",
        reverseButtons: true,
        confirmButtonColor: "#FBC02D",
        cancelButtonColor: "#607D8B",
        customClass: { confirmButton: "swal-reset-button" }
      }).then((result: any) => {
        if (result.isConfirmed) {
          queryUpdated.value = { ...queryOriginal.value };
        }
      });
    }

    return {
      queryOriginal,
      queryUpdated,
      loading,
      isObjectHasKeys,
      resetQuery,
      updateQuery,
      showJson,
      submit,
      userRoles
    };
  }
});
</script>

<style scoped>
#topbar-query-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

#query-main-container {
  width: 100%;
  height: calc(100% - 3.5rem);
  overflow: auto;
  background-color: #ffffff;
}

.content-buttons-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: auto;
}

.loading-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}

.content-json-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
}

.json-container {
  width: 50vw;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.content {
  flex: 1 1 auto;
  height: 100%;
  overflow: auto;
}

.json {
  flex: 0 1 auto;
  width: 100%;
  overflow: auto;
  border: 1px #dee2e6 solid;
  border-radius: 3px;
}

.json-header-container {
  padding: 0.5rem;
  height: 3rem;
  flex: 0 0 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.json-header {
  font-size: 1.5rem;
}

.json:deep(.vjs-value__string) {
  word-break: break-all;
}

.json:deep(.vjs-value) {
  font-size: 1rem;
}

.json:deep(.vjs-key) {
  font-size: 1rem;
}

.placeholder {
  height: 100%;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
}

#query-button-bar {
  flex: 0 1 auto;
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid #dee2e6;
  border-left: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  display: flex;
  flex-flow: row;
  justify-content: flex-end;
}

.topbar-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.p-divider {
  height: calc(100% - 2rem) !important;
  min-height: unset !important;
  align-self: center;
}

.json-toggle {
  position: absolute;
  top: 5px;
  right: 5px;
}

#query-builder-container {
  display: flex;
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
}
</style>
