<template>
  <div class="string-single-select-container">
    <span class="p-float-label" v-tooltip.top="{ value: userInput ? userInput : shape.name, class: 'string-single-select-tooltip' }">
      <InputText class="p-inputtext-lg input-text" :class="invalid && 'invalid'" v-model="userInput" type="text" @drop.prevent @dragover.prevent />
      <label>{{ shape.name }}</label>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import { useStore } from "vuex";
import axios from "axios";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape } from "im-library/dist/types/interfaces/Interfaces";
import { Enums, Helpers, Services } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { QueryService } = Services;
const { EditorMode } = Enums;

const props = defineProps({
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: String, default: "" },
  position: { type: Number, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMapUpdate = inject(injectionKeys.valueVariableMap)?.updateValueVariableMap;

const queryService = new QueryService(axios);

let key = props.shape.path["@id"];

let invalid = ref(false);

let userInput = ref("");
onMounted(() => {
  if (props.value) userInput.value = props.value;
});
watch(
  () => props.value,
  newValue => {
    if (newValue) userInput.value = newValue;
  }
);
watch(userInput, async newValue => {
  updateEntity(newValue);
  updateValueVariableMap(newValue);
  await updateValidity(newValue);
});

function updateEntity(data: string) {
  const result = {} as any;
  result[key] = data;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity(data: string) {
  if (isObjectHasKeys(props.shape, ["validation"]) && editorEntity)
    invalid.value = !(await queryService.checkValidation(props.shape.validation["@id"], editorEntity.value));
  else invalid.value = !defaultValidation(data);
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function updateValueVariableMap(data: string) {
  if (!props.shape.valueVariable) return;
  let mapKey = props.shape.valueVariable;
  if (props.shape.builderChild) mapKey = mapKey + props.shape.order;
  if (valueVariableMapUpdate) valueVariableMapUpdate(mapKey, data);
}

function defaultValidation(string: string) {
  return true;
}
</script>

<style scoped>
.string-single-select-container {
  padding: 2rem 0 0 0;
}
.input-text {
  width: 25rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.invalid {
  border-color: #e24c4c;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
  padding: 0 0 0.25rem 0;
}
</style>

<style>
.string-single-select-tooltip .p-tooltip-text {
  width: fit-content;
  word-wrap: break-word;
  word-break: normal;
}
</style>
