<template>
  <div class="string-single-display-container">
    <div class="input-loading-container">
      <span class="p-float-label" v-tooltip.top="{ value: userInput ? userInput : data.name, class: 'string-single-display-tooltip' }">
        <InputText disabled class="p-inputtext-lg input-text" :class="invalid && 'invalid'" v-model="userInput" type="text" />
        <label>{{ data.name }}</label>
      </span>
      <ProgressSpinner v-if="loading" class="loading-icon" stroke-width="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import store from "@/store";
import axios from "axios";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape } from "im-library/dist/types/interfaces/Interfaces";
import { Helpers, Services } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { QueryService } = Services;

const props = defineProps({
  data: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String, required: true },
  value: { type: String, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);

let key = props.data.path["@id"];
let loading = ref(false);

let invalid = ref(false);

let userInput = ref("");
watch([() => props.value, () => props.data], async ([newPropsValue, newDataValue]) => {
  if (props.value && newPropsValue) userInput.value = props.value;
  else userInput.value = await processPropertyValue(newDataValue);
});
watch(userInput, async newValue => {
  if (newValue) {
    updateEntity();
    await updateValidity();
  }
});
onMounted(async () => {
  if (props.value) userInput.value = props.value;
  else {
    loading.value = true;
    const result = await processPropertyValue(props.data);
    if (result) userInput.value = result;
    loading.value = false;
  }
});

async function processPropertyValue(property: PropertyShape): Promise<string> {
  if (isObjectHasKeys(property, ["isIri"])) {
    return property.isIri["@id"];
  }
  if (isObjectHasKeys(property, ["function", "argument"])) {
    return await queryService.runFunction(property.function["@id"], property.argument[0]);
  }
  if (isObjectHasKeys(property, ["function"])) {
    const result = await queryService.runFunction(property.function["@id"]);
    if (result && isObjectHasKeys(result, ["iri"])) return result.iri["@id"];
  }
  throw new Error("Property must have isIri or function key");
}

function updateEntity() {
  const result = {} as any;
  result[key] = userInput.value;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity() {
  if (isObjectHasKeys(props.data, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(userInput, props.data.validation["@id"]));
    if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
  } else {
    if (validityUpdate) validityUpdate({ key: key, valid: true });
  }
}
</script>

<style scoped>
.input-loading-container {
  display: flex;
  flex-flow: row nowrap;
  width: 25rem;
  align-items: center;
}
.p-float-label {
  flex: 1 1 auto;
}
.loading-icon {
  flex: 0 0 auto;
}
.p-progress-spinner {
  width: 2rem;
  height: 2rem;
}
.input-text {
  width: 100%;
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
.string-single-display-tooltip .p-tooltip-text {
  width: fit-content;
  word-wrap: break-word;
  word-break: normal;
}
</style>
