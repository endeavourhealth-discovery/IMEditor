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
      <div v-if="loading" class="loading-container">
        <ProgressSpinner />
      </div>
      <div v-else class="content-buttons-container">
        <div class="content-json-container">
          <div class="steps-content">
            <Steps :model="stepsItems" :readonly="false" @click="stepsClicked" />
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" :data="groups.length ? groups[currentStep - 1] : undefined" :mode="EditorMode.CREATE" />
              </keep-alive>
            </router-view>
          </div>
          <Divider v-if="showJson" layout="vertical" />
          <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>
            <VueJsonPretty class="json" :path="'res'" :data="editorEntity" @click="handleClick" />
          </div>
          <Button
            class="p-button-rounded p-button-info p-button-outlined json-toggle"
            :label="showJson ? 'hide JSON' : 'show JSON'"
            @click="showJson = !showJson"
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
import Group from "@/components/creator/Group.vue";

export default defineComponent({
  components: { Group, TypeSelector }
});
</script>

<script setup lang="ts">
import { onUnmounted, onBeforeUnmount, onMounted, computed, ref, Ref, watch, inject, defineComponent, PropType, provide } from "vue";
import { Enums, Helpers, Vocabulary, Services } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import _ from "lodash";
import store from "@/store";
import axios from "axios";
import Swal from "sweetalert2";
import { useConfirm } from "primevue/useconfirm";
import { useRouter } from "vue-router";
import injectionKeys from "@/injectionKeys/injectionKeys";
import { FormGenerator, PropertyGroup, PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { any } from "cypress/types/bluebird";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  ConceptTypeMethods: { isValueSet },
  EntityValidator: { hasValidIri, hasValidName, hasValidParents, hasValidTypes, hasValidStatus },
  Converters: { iriToUrl }
} = Helpers;
const { IM, RDF, RDFS } = Vocabulary;
const { EntityService, Env } = Services;
const { ComponentType, EditorMode } = Enums;

const userRoles = inject(injectionKeys.userRoles);

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

let editorEntityOriginal: Ref<any> = ref({});
let editorEntity: Ref<any> = ref({});
let loading: Ref<boolean> = ref(true);
let stepsItems: Ref<{ label: string; to: string }[]> = ref([]);
let currentStep: Ref<number> = ref(0);
let showJson: Ref<boolean> = ref(false);
let creatorInvalidEntity: Ref<boolean> = ref(false);
let creatorValidity: Ref<{ key: string; valid: boolean }[]> = ref([]);
let shape: Ref<FormGenerator | undefined> = ref();
let targetShape: Ref<TTIriRef | undefined> = ref();
let groups: Ref<PropertyGroup[]> = ref([]);
let valueVariableMap: Ref<Map<string, any>> = ref(new Map<string, any>());

provide(injectionKeys.editorValidity, { validity: creatorValidity, updateValidity, removeValidity });
provide(injectionKeys.invalidEditorEntity, creatorInvalidEntity);

provide(injectionKeys.editorEntity, { editorEntity, updateEntity });
provide(injectionKeys.valueVariableMap, valueVariableMap);

onMounted(async () => {
  loading.value = true;
  if (props.type) {
    await getShape(props.type["@id"]);
    if (shape.value) processShape(shape.value);
  } else {
    router.push({ name: "TypeSelector" });
  }
  loading.value = false;
});

watch(
  () => _.cloneDeep(creatorValidity.value),
  (newValue: { key: string; valid: boolean }[]) => {
    creatorInvalidEntity.value = newValue.every(item => item.valid);
  }
);

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

watch([() => _.cloneDeep(editorEntity.value), () => _.cloneDeep(groups.value)], ([newEntity, newGroups]) => {
  setValueVariableMap(newEntity, newGroups);
});

const entityService = new EntityService(axios);

async function getShape(type: string): Promise<void> {
  const shapeIri = await entityService.getShapeFromType(type);
  if (shapeIri) shape.value = await entityService.getShape(shapeIri["@id"]);
}

function setValueVariableMap(entity: any, groups: PropertyGroup[]) {
  if (entity && groups.length) {
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
  const index = creatorValidity.value.findIndex(item => item.key === data.key);
  if (index) creatorValidity.value[index] = data;
  else creatorValidity.value.push(data);
}

function removeValidity(data: { key: string; valid: boolean }) {
  const index = creatorValidity.value.findIndex(item => (item.key = data.key));
  if (index) creatorValidity.value.splice(index, 1);
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
  loading.value = false;
  stepsForward();
}

function setSteps() {
  stepsItems.value = [];
  stepsItems.value.push({ label: "Type", to: "/creator/type" });
  const creatorRoute = router.options.routes.find(r => r.name === "Creator");
  if (creatorRoute) {
    groups.value.forEach(group => {
      const label = getNameFromLabel(group.label);
      if (creatorRoute.children?.findIndex(route => route.name === label) === -1) {
        creatorRoute.children?.push({ path: label, name: label, component: Group });
      }
      stepsItems.value.push({ label: getNameFromLabel(group.label), to: "/creator/" + label });
    });
    router.addRoute(creatorRoute);
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

  if (creatorInvalidEntity.value) {
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

async function isValidEntity(entity: any): Promise<boolean> {
  if (!isObjectHasKeys(entity)) {
    creatorValidity.value = [];
    creatorInvalidEntity.value = true;
    return false;
  }
  creatorValidity.value = [];
  for (const [key, value] of Object.entries(entity)) {
    const property = {} as any;
    property[key] = await isValidProperty(value);
    creatorValidity.value.push(property);
  }
  const valid = creatorValidity.value.every(item => item.valid === true);
  creatorInvalidEntity.value = !valid;
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

.content-json-container {
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
