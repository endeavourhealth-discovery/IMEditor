<template>
  <div id="topbar-editor-container">
    <TopBar>
      <template #content>
        <div class="topbar-content">
          <span class="title"><strong>IM Editor:</strong></span>
          <span class="entity-name" v-tooltip="{ value: entityName, class: 'name-tooltip' }">{{ entityName }}</span>
        </div>
      </template>
    </TopBar>
    <ConfirmDialog></ConfirmDialog>
    <div id="editor-main-container">
      <div v-if="loading" class="loading-container">
        <ProgressSpinner />
      </div>
      <div v-else class="content-buttons-container">
        <div class="content-json-container">
          <div class="steps-content">
            <Steps :model="stepsItems" :readonly="false" @click="stepsClicked" />
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" :data="groups.length ? groups[currentStep] : undefined" :mode="EditorMode.EDIT" />
              </keep-alive>
            </router-view>
          </div>
          <Divider v-if="showJson" layout="vertical" />
          <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>
            <VueJsonPretty v-if="isObjectHasKeys(editorEntity)" class="json" :path="'res'" :data="editorEntity" @click="handleClick" />
          </div>
          <Button
            class="p-button-rounded p-button-info p-button-outlined json-toggle"
            :label="showJson ? 'hide JSON' : 'show JSON'"
            @click="showJson = !showJson"
          />
        </div>
        <div class="button-bar" id="editor-button-bar">
          <Button :disabled="currentStep === 0" icon="pi pi-angle-left" label="Back" @click="stepsBack" />
          <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="refreshEditor" />
          <Button icon="pi pi-check" label="Save" class="save-button" @click="submit" />
          <Button :disabled="currentStep >= stepsItems.length - 1" icon="pi pi-angle-right" label="Next" @click="stepsForward" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import TypeSelector from "@/components/creator/TypeSelector.vue";
import Group from "@/components/creator/Group.vue";

export default defineComponent({
  components: { Group, TypeSelector }
});
</script>

<script setup lang="ts">
import { computed, defineComponent, inject, onBeforeUnmount, onMounted, onUnmounted, provide, ref, Ref, watch } from "vue";
import injectionKeys from "@/injectionKeys/injectionKeys";
import { useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { FormGenerator, PropertyGroup, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import _ from "lodash";
import axios from "axios";
import Swal from "sweetalert2";
import store from "@/store";
import ConfirmDialog from "primevue/confirmdialog";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { Enums, Vocabulary, Helpers, Services } from "im-library";
const { IM, RDF, RDFS } = Vocabulary;
const {
  ConceptTypeMethods: { isValueSet },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EntityValidator: { hasValidIri, hasValidName, hasValidParents, hasValidStatus, hasValidTypes },
  Converters: { iriToUrl }
} = Helpers;
const { Env, EntityService } = Services;
const { EditorMode } = Enums;

const userRoles = inject(injectionKeys.userRoles);

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

let editorEntityOriginal: Ref<any> = ref({});
let editorEntity: Ref<any> = ref({});
let loading = ref(true);
let stepsItems: Ref<{ label: string; to: string }[]> = ref([]);
let currentStep = ref(0);
let showJson = ref(false);
let editorInvalidEntity = ref(false);
let editorValidity: Ref<{ key: string; valid: boolean }[]> = ref([]);
let shape: Ref<FormGenerator | undefined> = ref();
let targetShape: Ref<TTIriRef | undefined> = ref();
let groups: Ref<PropertyGroup[]> = ref([]);
let valueVariableMap: Ref<Map<string, any>> = ref(new Map<string, any>());
let entityName = ref("");

provide(injectionKeys.editorValidity, { validity: editorValidity, updateValidity, removeValidity });
provide(injectionKeys.invalidEditorEntity, editorInvalidEntity);

provide(injectionKeys.editorEntity, { editorEntity, updateEntity });
provide(injectionKeys.valueVariableMap, valueVariableMap);

onMounted(async () => {
  loading.value = true;
  await fetchEntity();
  if (isObjectHasKeys(editorEntityOriginal.value)) {
    await getShape(editorEntityOriginal.value[RDF.TYPE][0]["@id"]);
    if (shape.value) processShape(shape.value);
    router.push(stepsItems.value[0].to);
  } else window.location.href = Env.DIRECTORY_URL;
  loading.value = false;
});

watch(
  () => _.cloneDeep(editorValidity.value),
  newValue => {
    editorInvalidEntity.value = newValue.every(item => item.valid);
  }
);

watch(
  () => _.cloneDeep(editorEntity.value),
  () => {
    if (checkForChanges()) {
      window.addEventListener("beforeunload", beforeWindowUnload);
    } else {
      window.removeEventListener("beforeunload", beforeWindowUnload);
    }
  }
);

watch([() => _.cloneDeep(editorEntity.value), () => _.cloneDeep(groups.value)], ([newEntity, newGroups]) => {
  setValueVariableMap(newEntity, newGroups);
});

const entityService = new EntityService(axios);

const editorIri = computed(() => store.state.editorIri).value;
const editorSavedEntity = computed(() => store.state.editorSavedEntity).value;

async function fetchEntity(): Promise<void> {
  if (editorIri) {
    const fullEntity = await entityService.getFullEntity(editorIri);
    if (isObjectHasKeys(fullEntity)) {
      editorEntityOriginal.value = fullEntity;
      entityName.value = editorEntityOriginal.value[RDFS.LABEL];
      if (isObjectHasKeys(editorSavedEntity, ["@id"]) && editorSavedEntity["@id"] === editorIri) {
        editorEntity.value = editorSavedEntity;
      } else {
        editorEntity.value = JSON.parse(JSON.stringify(fullEntity));
      }
    }
  }
}

async function getShape(type: string): Promise<void> {
  let localType;
  if (hasType) localType = editorEntity.value[RDF.TYPE][0]["@id"];
  else localType = type;
  const shapeIri = await entityService.getShapeFromType(localType);
  if (shapeIri) shape.value = await entityService.getShape(shapeIri["@id"]);
}

function setValueVariableMap(entity: any, groups: PropertyGroup[]) {
  if (entity && entity.length) {
    groups.forEach(group => {
      group.property.forEach(property => {
        if (property.valueVariable) {
          const value = entity[property.path["@id"]];
          valueVariableMap.value.set(property.valueVariable, value);
        }
      });
    });
  }
}

function updateValidity(data: { key: string; valid: boolean }) {
  const index = editorValidity.value.findIndex(item => item.key === data.key);
  if (index) editorValidity.value[index] = data;
  else editorValidity.value.push(data);
}

function removeValidity(data: { key: string; valid: boolean }) {
  const index = editorValidity.value.findIndex(item => (item.key = data.key));
  if (index) editorValidity.value.splice(index, 1);
}

function stepsClicked(event: any) {
  currentStep.value = event.target.innerHTML - 1;
}

function processShape(shape: FormGenerator) {
  targetShape.value = shape.targetShape;
  groups.value = shape.group;
  setSteps();
}

async function updateType(typeIri: string) {
  loading.value = true;
  await getShape(typeIri);
  if (shape.value) processShape(shape.value);
  editorEntity.value[RDF.TYPE] = typeIri;
  removeEroneousKeys();
  loading.value = false;
}

function setSteps() {
  stepsItems.value = [];
  const editorRoute = router.options.routes.find(r => r.name === "Editor");
  if (editorRoute) {
    groups.value.forEach(group => {
      const label = getNameFromLabel(group.label);
      if (editorRoute.children?.findIndex(route => route.name === label) === -1) {
        editorRoute.children?.push({ path: label, name: label, component: Group });
      }
      stepsItems.value.push({ label: getNameFromLabel(group.label), to: "/editor/" + label });
    });
    router.addRoute(editorRoute);
  }
}

function getNameFromLabel(label: string) {
  if (!label) return "";
  return label.split("-")[1].trim();
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
  if (isArrayHasLength(data)) {
    data.forEach((item: any) => {
      if (isObjectHasKeys(item)) {
        for (const [key, value] of Object.entries(item)) {
          editorEntity.value[key] = value;
        }
      }
    });
  } else if (isObjectHasKeys(data)) {
    if (isObjectHasKeys(data, [RDF.TYPE])) {
      if (!isObjectHasKeys(editorEntity.value, [RDF.TYPE])) updateType(data[RDF.TYPE]);
      else if (editorEntity.value[RDF.TYPE] !== data[RDF.TYPE]) updateType(data[RDF.TYPE]);
    } else {
      for (const [key, value] of Object.entries(data)) {
        editorEntity.value[key] = value;
      }
    }
  }

  if (editorInvalidEntity.value) {
    isValidEntity(editorEntity.value);
  }
}

function checkForChanges() {
  if (JSON.stringify(editorEntity.value) === JSON.stringify(editorEntityOriginal.value)) {
    return false;
  } else {
    return true;
  }
}

async function submit(): Promise<void> {
  if (await isValidEntity(editorEntity.value)) {
    console.log("submit");
    await Swal.fire({
      icon: "info",
      title: "Confirm save",
      text: "Are you sure you want to save your changes?",
      showCancelButton: true,
      confirmButtonText: "Save",
      reverseButtons: true,
      confirmButtonColor: "#2196F3",
      cancelButtonColor: "#607D8B",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        const res = await entityService.updateEntity(editorEntity.value);
        if (res) return res;
        else Swal.showValidationMessage("Error saving entity to server.");
      }
    }).then(async (result: any) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Success",
          text: "Entity" + editorEntity.value["@id"] + " has been updated.",
          icon: "success",
          showCancelButton: true,
          reverseButtons: true,
          confirmButtonText: "Open in Viewer",
          confirmButtonColor: "#2196F3",
          cancelButtonColor: "#607D8B"
        }).then(async (result: any) => {
          if (result.isConfirmed) {
            window.location.href = Env.VIEWER_URL + "concept?selectedIri=" + iriToUrl(editorEntity.value["@id"]);
          } else {
            await fetchEntity();
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
    editorValidity.value = [];
    editorInvalidEntity.value = true;
    return false;
  }
  editorValidity.value = [];
  for (const [key, value] of Object.entries(entity)) {
    const property = {} as any;
    property[key] = await isValidProperty(value);
    editorValidity.value.push(property);
  }
  const valid = editorValidity.value.every(item => item.valid === true);
  editorInvalidEntity.value = !valid;
  return valid;
}

function refreshEditor() {
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

function handleClick(data: any) {
  console.log("click");
  console.log(data);
}

defineExpose({ confirmLeavePage });
</script>

<style scoped>
#topbar-editor-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

#editor-main-container {
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

.steps-content {
  flex: 1 1 auto;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
}

.p-steps {
  width: 100%;
  padding-top: 1rem;
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

#editor-button-bar {
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

.entity-name {
  margin-left: 0.5rem;
  font-size: 1.5rem;
  overflow: hidden;
  height: 1.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 1 auto;
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
  background-color: #ffffff !important;
}

#summary-editor-container {
  display: flex;
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
}
</style>
