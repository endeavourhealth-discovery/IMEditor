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
      <div class="content-buttons-container">
        <div class="content-sidebar-container">
          <div v-if="loading" class="loading-container">
            <ProgressSpinner />
          </div>
          <div v-else class="steps-content">
            <Steps :model="stepsItems" :readonly="false" @click="stepsClicked" />
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" :shape="groups.length ? groups[currentStep - 1] : undefined" :mode="EditorMode.CREATE" />
              </keep-alive>
            </router-view>
          </div>
          <Divider v-if="showSidebar" layout="vertical" />
          <div v-if="showSidebar" class="sidebar-container">
            <SideBar :editorEntity="editorEntity" />
          </div>
          <Button
            class="p-button-rounded p-button-info p-button-outlined sidebar-toggle"
            :label="showSidebar ? 'hide sidebar' : 'show sidebar'"
            @click="showSidebar = !showSidebar"
          />
        </div>
        <div class="button-bar" id="creator-button-bar">
          <Button :disabled="currentStep === 0" icon="pi pi-angle-left" label="Back" @click="stepsBack" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="refreshCreator" />
          <Button icon="pi pi-check" label="Create" class="p-button-success save-button" @click="submit" />
          <Button :disabled="currentStep >= stepsItems.length - 1" icon="pi pi-angle-right" label="Next" @click="stepsForward" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import TypeSelector from "@/components/creator/TypeSelector.vue";
import StepsGroup from "@/components/creator/StepsGroup.vue";

export default defineComponent({
  components: { StepsGroup, TypeSelector }
});
</script>

<script setup lang="ts">
import { onUnmounted, onBeforeUnmount, onMounted, computed, ref, Ref, watch, inject, defineComponent, PropType, provide } from "vue";
import { Enums, Helpers, Vocabulary, Services } from "im-library";
import SideBar from "@/components/creator/SideBar.vue";
import _ from "lodash";
import store from "@/store";
import axios from "axios";
import Swal from "sweetalert2";
import { setupShape, setupEntity } from "./EditorMethods";
import { useConfirm } from "primevue/useconfirm";
import { useRouter } from "vue-router";
import injectionKeys from "@/injectionKeys/injectionKeys";
import { FormGenerator, PropertyGroup, PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";

const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  ConceptTypeMethods: { isValueSet },
  EntityValidator: { hasValidIri, hasValidName, hasValidParents, hasValidTypes, hasValidStatus },
  Converters: { iriToUrl },
  UtililityMethods: { debounce }
} = Helpers;
const { IM, RDF, RDFS } = Vocabulary;
const { EntityService, Env, FilerService } = Services;
const { ComponentType, EditorMode } = Enums;

const props = defineProps({ type: { type: Object as PropType<TTIriRef>, required: false } });

const router = useRouter();
const confirm = useConfirm();

onBeforeUnmount(() => {
  confirmLeavePage();
});

onUnmounted(() => {
  window.removeEventListener("beforeunload", beforeWindowUnload);
});

const hasType = computed<boolean>(() => {
  return isObjectHasKeys(editorEntity.value, [RDF.TYPE]);
});

const { editorEntity, editorEntityOriginal, fetchEntity, processEntity, editorIri, editorSavedEntity, entityName } = setupEntity();
const { setCreatorSteps, shape, stepsItems, getShape, getShapesCombined, groups, processComponentType, processShape, addToShape } = setupShape();

let loading: Ref<boolean> = ref(true);
let currentStep: Ref<number> = ref(0);
let showSidebar: Ref<boolean> = ref(false);
let creatorValidity: Ref<{ key: string; valid: boolean }[]> = ref([]);
let targetShape: Ref<TTIriRef | undefined> = ref();
let valueVariableMap: Ref<Map<string, any>> = ref(new Map<string, any>());

provide(injectionKeys.editorValidity, { validity: creatorValidity, updateValidity, removeValidity });

provide(injectionKeys.editorEntity, { editorEntity, updateEntity, deleteEntityKey });
provide(injectionKeys.valueVariableMap, { valueVariableMap, updateValueVariableMap });

onMounted(async () => {
  loading.value = true;
  if (props.type) {
    await getShape(props.type["@id"]);
    if (shape.value) processShape(shape.value, EditorMode.CREATE);
  } else {
    router.push({ name: "TypeSelector" });
  }
  loading.value = false;
});

watch(
  () => _.cloneDeep(editorEntity.value),
  (newValue: any) => {
    if (checkForChanges()) {
      window.addEventListener("beforeunload", beforeWindowUnload);
    } else {
      window.removeEventListener("beforeunload", beforeWindowUnload);
    }
  }
);

const entityService = new EntityService(axios);
const filerService = new FilerService(axios);
const currentUser = computed(() => store.state.currentUser).value;

const debouncedFiler = debounce((entity: any) => {
  fileChanges(entity);
}, 500);

function updateValueVariableMap(key: string, value: any) {
  valueVariableMap.value.set(key, value);
}

function updateValidity(data: { key: string; valid: boolean }) {
  const index = creatorValidity.value.findIndex(item => item.key === data.key);
  if (index != -1) creatorValidity.value[index] = data;
  else creatorValidity.value.push(data);
}

function removeValidity(data: { key: string; valid: boolean }) {
  const index = creatorValidity.value.findIndex(item => (item.key = data.key));
  if (index) creatorValidity.value.splice(index, 1);
}

function stepsClicked(event: any) {
  currentStep.value = event.target.innerHTML - 1;
}

async function updateType(types: TTIriRef[]) {
  loading.value = true;
  await getShapesCombined(types);
  if (shape.value) processShape(shape.value, EditorMode.CREATE);
  editorEntity.value[RDF.TYPE] = types;
  loading.value = false;
  if (currentStep.value === 0) stepsForward();
}

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

function updateEntity(data: any) {
  let wasUpdated = false;
  if (isArrayHasLength(data)) {
    data.forEach((item: any) => {
      if (isObjectHasKeys(item)) {
        for (const [key, value] of Object.entries(item)) {
          editorEntity.value[key] = value;
          wasUpdated = true;
        }
      }
    });
  } else if (isObjectHasKeys(data)) {
    if (isObjectHasKeys(data, [RDF.TYPE])) {
      if (!isObjectHasKeys(editorEntity.value, [RDF.TYPE])) {
        updateType(data[RDF.TYPE]);
        wasUpdated = true;
      } else if (JSON.stringify(editorEntity.value[RDF.TYPE]) !== JSON.stringify(data[RDF.TYPE])) {
        updateType(data[RDF.TYPE]);
        wasUpdated = true;
      }
    } else {
      for (const [key, value] of Object.entries(data)) {
        editorEntity.value[key] = value;
        wasUpdated = true;
      }
    }
  }

  if (wasUpdated && isValidEntity(editorEntity.value)) {
    debouncedFiler(editorEntity.value);
  }
}

function deleteEntityKey(data: string) {
  if (data) delete editorEntity.value[data];
}

function fileChanges(entity: any) {
  filerService.fileEntity(entity, "http://endhealth.info/user/" + currentUser.id + "#", IM.UPDATE_ALL);
}

function checkForChanges() {
  if (JSON.stringify(editorEntity.value) === JSON.stringify(editorEntityOriginal.value)) {
    return false;
  } else {
    return true;
  }
}

async function submit(): Promise<void> {
  if (isValidEntity(editorEntity.value)) {
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
        const res = await entityService.createEntity(editorEntity.value);
        if (res) return res;
        else Swal.showValidationMessage("Error creating entity from server.");
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Success",
          text: "Entity" + editorEntity.value["@id"] + " has been created.",
          icon: "success",
          showCancelButton: true,
          reverseButtons: true,
          confirmButtonText: "Open in Viewer",
          confirmButtonColor: "#2196F3",
          cancelButtonColor: "#607D8B"
        }).then((result: any) => {
          if (result.isConfirmed) {
            window.location.href = Env.VIEWER_URL + "concept?selectedIri=" + iriToUrl(editorEntity.value["@id"]);
          } else {
            router.push({ name: "Editor", params: { selectedIri: editorEntity.value["@id"] } });
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

function isValidEntity(entity: any): boolean {
  return isObjectHasKeys(entity) && entity["@id"] && creatorValidity.value.every(validity => validity.valid);
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
      editorEntity.value = { ...editorEntityOriginal.value };
      currentStep.value = 0;
      router.push(stepsItems.value[currentStep.value].to);
    }
  });
}

function stepsBack() {
  currentStep.value--;
  if (currentStep.value >= 0) router.push(stepsItems.value[currentStep.value].to);
}

function stepsForward() {
  currentStep.value++;
  if (currentStep.value < stepsItems.value.length) router.push(stepsItems.value[currentStep.value].to);
}

defineExpose({ confirmLeavePage });
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

.content-sidebar-container {
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

.sidebar-container {
  width: 50vw;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  padding-top: 3rem;
}

.sidebar-header-container {
  padding: 0.5rem;
  height: 3rem;
  flex: 0 0 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.sidebar-header {
  font-size: 1.5rem;
}

.sidebar-toggle {
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

<style>
.p-steps-number {
  z-index: 0 !important;
}
</style>
