<template>
  <div class="html-input-container">
    <span class="p-float-label">
      <Textarea class="p-inputtext-lg input-html" :class="invalid && 'invalid'" v-model="userInput" rows="4" @drop.prevent />
      <label>{{ shape.name }}</label>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import axios from "axios";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape } from "im-library/dist/types/interfaces/Interfaces";
import { Enums, Helpers, Services } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { QueryService } = Services;

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
  if (props.value) userInput.value = htmlToText(props.value);
});
watch(userInput, async newValue => {
  updateEntity(newValue);
  updateValueVariableMap(newValue);
  await updateValidity();
});

function updateEntity(data: string) {
  const result = {} as any;
  result[key] = textToHtml(data);
  if (entityUpdate) entityUpdate(result);
}

function updateValueVariableMap(data: string) {
  if (!props.shape.valueVariable) return;
  let mapKey = props.shape.valueVariable;
  if (props.shape.builderChild) mapKey = mapKey + props.shape.order;
  if (valueVariableMapUpdate) valueVariableMapUpdate(mapKey, data);
}

async function updateValidity() {
  if (isObjectHasKeys(props.shape, ["validation"]) && editorEntity)
    invalid.value = await queryService.checkValidation(props.shape.validation["@id"], editorEntity.value);
  else invalid.value = !defaultValidation(userInput.value);
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidation(userInput: string) {
  return userInput.length < 500;
}

function textToHtml(text: string): string {
  return text.replaceAll(/\n/g, "<p>");
}

function htmlToText(text: string): string {
  return text.replaceAll(/<p>/g, "\n");
}
</script>

<style scoped>
.html-input-container {
  width: 25rem;
  padding: 2rem 0 0 0;
}
.input-html {
  width: 100%;
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
