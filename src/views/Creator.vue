<template>
  <div id="topbar-creator-container">
    <TopBar>
      <template #content>
        <div class="topbar-content">
          <span class="title"><strong>IM Creator</strong></span>
        </div>
      </template>
    </TopBar>
    <ConfirmDialog />
    <div id="creator-main-container">
      <div class="loading-container" v-if="loading">
        <ProgressSpinner />
      </div>
      <div v-else class="content-buttons-container">
        <div class="steps-json-container">
          <div class="steps-content">
            <Steps :model="stepsItems" />
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" :updatedConcept="conceptUpdated" @concept-updated="updateConcept" mode="create" />
              </keep-alive>
            </router-view>
          </div>
          <Divider v-if="showJson" layout="vertical" />
          <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>
            <VueJsonPretty class="json" :path="'res'" :data="conceptUpdated" @click="handleClick" />
          </div>
          <Button
            class="p-button-rounded p-button-info p-button-outlined json-toggle"
            :label="showJson ? 'hide JSON' : 'show JSON'"
            @click="showJson = !showJson"
          />
        </div>
        <div class="button-bar" id="creator-button-bar">
          <Button v-if="currentStep > 0" icon="pi pi-angle-left" label="Back" @click="stepsBack" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="refreshCreator" />
          <Button icon="pi pi-check" label="Create" class="p-button-success save-button" @click="submit" />
          <Button v-if="currentStep < stepsItems.length - 1" icon="pi pi-angle-right" label="Next" @click="stepsForward" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { onUnmounted, onBeforeUnmount, onMounted, computed, ref, Ref, watch, inject, defineComponent } from "vue";
import { Helpers, Vocabulary, Services } from "im-library";
import TypeSelector from "@/components/creator/TypeSelector.vue";
import VueJsonPretty from "vue-json-pretty";
import _ from "lodash";
import store from "@/store";
import axios from "axios";
import Swal from "sweetalert2";
import { useConfirm } from "primevue/useconfirm";
import { useRouter } from "vue-router";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  ConceptTypeMethods: { isValueSet },
  EntityValidator: { hasValidIri, hasValidName, hasValidParents, hasValidTypes, hasValidStatus },
  Converters: { iriToUrl }
} = Helpers;
const { IM, RDF, RDFS } = Vocabulary;
const { EntityService, Env } = Services;

export default defineComponent({
  name: "Creator",
  beforeRouteLeave() {
    this.confirmLeavePage();
  },
  components: {
    TypeSelector,
    VueJsonPretty
  },
  setup() {
    const userRoles = inject("userRoles");

    onBeforeUnmount(() => {
      confirmLeavePage();
    });

    onUnmounted(() => {
      window.removeEventListener("beforeunload", beforeWindowUnload);
    });

    const toggleConfirmLeaveDialog = computed<void>(() => {
      if (checkForChanges()) {
        window.addEventListener("beforeunload", beforeWindowUnload);
      } else {
        window.removeEventListener("beforeunload", beforeWindowUnload);
      }
    });

    const hasType = computed<boolean>(() => {
      return isObjectHasKeys(conceptUpdated.value, [RDF.TYPE]);
    });

    const filterOptions = computed(() => store.state.filterOptions);
    const creatorInvalidEntity = computed(() => store.state.creatorInvalidEntity);

    onMounted(async () => {
      loading.value = true;
      await getFilterOptions();
      setStepsFromType(hasType ? conceptUpdated.value[RDF.TYPE] : []);
      loading.value = false;
    });

    let conceptOriginal: Ref<any> = ref({});
    let conceptUpdated: Ref<any> = ref({});
    let loading: Ref<boolean> = ref(true);
    let stepsItems: Ref<{ label: string; to: string }[]> = ref([]);
    let currentStep: Ref<number> = ref(0);
    let showJson: Ref<boolean> = ref(false);

    watch(
      (): void => _.cloneDeep(conceptUpdated.value),
      (newValue: any) => {
        if (hasType) {
          setStepsFromType(newValue[RDF.TYPE]);
        }
      }
    );

    const entityService = new EntityService(axios);

    async function getFilterOptions(): Promise<void> {
      if (!(isObjectHasKeys(filterOptions) && isArrayHasLength(filterOptions.value.schemes))) {
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

    const confirm = useConfirm();

    function confirmLeavePage() {
      if (checkForChanges()) {
        confirm.require({
          message: "All unsaved changes will be lost. Are you sure you want to proceed?",
          header: "Confirmation",
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            return true;
          },
          reject: () => {
            return false;
          }
        });
      } else {
        return true;
      }
    }

    function beforeWindowUnload(e: any) {
      if (checkForChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    }

    const router = useRouter();

    function updateConcept(data: any) {
      if (isArrayHasLength(data)) {
        data.forEach((item: any) => {
          if (isObjectHasKeys(item)) {
            for (const [key, value] of Object.entries(item)) {
              conceptUpdated.value[key] = value;
            }
          }
        });
      } else if (isObjectHasKeys(data)) {
        for (const [key, value] of Object.entries(data)) {
          conceptUpdated.value[key] = value;
        }
      }

      if (creatorInvalidEntity.value) {
        isValidEntity(conceptUpdated.value);
      }
    }

    function checkForChanges() {
      if (JSON.stringify(conceptUpdated.value) === JSON.stringify(conceptOriginal.value)) {
        return false;
      } else {
        return true;
      }
    }

    async function submit(): Promise<void> {
      if (await isValidEntity(conceptUpdated.value)) {
        console.log("submit");
        await Swal.fire({
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
            const res = await entityService.createEntity(conceptUpdated.value);
            if (res) return res;
            else Swal.showValidationMessage("Error creating entity from server.");
          }
        }).then((result: any) => {
          if (result.isConfirmed) {
            Swal.fire({
              title: "Success",
              text: "Entity" + conceptUpdated.value["@id"] + " has been created.",
              icon: "success",
              showCancelButton: true,
              reverseButtons: true,
              confirmButtonText: "Open in Viewer",
              confirmButtonColor: "#2196F3",
              cancelButtonColor: "#607D8B"
            }).then((result: any) => {
              if (result.isConfirmed) {
                window.location.href = Env.VIEWER_URL + "concept?selectedIri=" + iriToUrl(conceptUpdated.value["@id"]);
              } else {
                router.push({ name: "Editor", params: { selectedIri: conceptUpdated.value["@id"] } });
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

    async function isValidEntity(entity: any): Promise<boolean> {
      if (!isObjectHasKeys(entity)) {
        store.commit("updateCreatorValidity", []);
        store.commit("updateCreatorInvalidEntity", true);
        return false;
      }
      const creatorValidity = [] as { key: string; valid: boolean }[];
      creatorValidity.push({ key: "iri", valid: hasValidIri(entity) });
      if (hasValidIri(entity)) creatorValidity.push({ key: "iriExists", valid: !(await entityService.iriExists(entity["@id"])) });
      creatorValidity.push({ key: "name", valid: hasValidName(entity) });
      creatorValidity.push({ key: "types", valid: hasValidTypes(entity) });
      creatorValidity.push({ key: "status", valid: hasValidStatus(entity) });
      creatorValidity.push({ key: "parents", valid: hasValidParents(entity) });
      store.commit("updateCreatorValidity", creatorValidity);
      const valid = creatorValidity.every(item => item.valid === true);
      store.commit("updateCreatorInvalidEntity", !valid);
      return valid;
    }

    function refreshCreator() {
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
          conceptUpdated.value = { ...conceptOriginal.value };
        }
      });
    }

    function setStepsFromType(types: any[]) {
      if (isValueSet(types)) {
        if (stepsItems.value.findIndex(item => item.label === "Members") === -1) {
          stepsItems.value.push({
            label: "Members",
            to: "/creator/members"
          });
        }
      } else {
        stepsItems.value = [
          {
            label: "Type",
            to: "/creator/type"
          },
          {
            label: "Summary",
            to: "/creator/summary"
          },
          { label: "Parents", to: "/creator/parents" }
        ];
      }
      if (types && types.length && currentStep.value === 0) {
        currentStep.value++;
        router.push(stepsItems.value[1].to);
      }
    }

    function stepsBack() {
      currentStep.value--;
      if (currentStep.value >= 0) router.push(stepsItems.value[currentStep.value].to);
    }

    function stepsForward() {
      currentStep.value++;
      if (currentStep.value < stepsItems.value.length) router.push(stepsItems.value[currentStep.value].to);
    }

    function handleClick(data: any) {
      console.log("click");
      console.log(data);
    }

    return {
      confirmLeavePage,
      loading,
      stepsItems,
      conceptUpdated,
      conceptOriginal,
      showJson,
      handleClick,
      currentStep,
      updateConcept,
      stepsBack,
      stepsForward,
      refreshCreator,
      submit
    };
  }
});
</script>

<style scoped>
#topbar-creator-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

#creator-main-container {
  height: calc(100% - 3.5rem);
  width: 100%;
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

.steps-json-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
}

.steps-content {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
}

.p-steps {
  width: 90%;
}

.json-container {
  width: 50vw;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
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

.json-toggle {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: #ffffff !important;
}

.topbar-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
}

.loading-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}

.p-steps {
  padding-top: 1rem;
}

.button-bar {
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
</style>
