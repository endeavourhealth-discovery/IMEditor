<template>
  <div class="string-single-display-container">
    <div class="input-loading-container">
      <span class="p-float-label" v-tooltip.top="{ value: userInput ? userInput : shape.name, class: 'string-single-display-tooltip' }">
        <InputText disabled class="p-inputtext-lg input-text" :class="invalid && 'invalid'" v-model="userInput" type="text" />
        <label>{{ shape.name }}</label>
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
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import { Argument } from "im-library/dist/types/models/modules/AutoGen";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { QueryService } = Services;
const { IM, SHACL } = Vocabulary;
const { EditorMode } = Enums;

const props = defineProps({
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: String, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMap = inject(injectionKeys.valueVariableMap);

const queryService = new QueryService(axios);

let key = props.shape.path["@id"];
let loading = ref(false);

let invalid = ref(false);

let userInput = ref("");
watch([() => props.value, () => props.shape], async ([newPropsValue, newShapeValue]) => {
  if (newPropsValue && newShapeValue) userInput.value = newPropsValue;
  else userInput.value = await processPropertyValue(newShapeValue);
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
    const result = await processPropertyValue(props.shape);
    if (result) userInput.value = result;
    loading.value = false;
  }
});

watch(
  () => _.cloneDeep(valueVariableMap?.value),
  async (newValue, oldValue) => {
    if (!userInput.value && newValue && oldValue && !compareMaps(newValue, oldValue)) {
      loading.value = true;
      if (newValue?.size) userInput.value = await processPropertyValue(props.shape);
      loading.value = false;
    }
  }
);

function compareMaps(map1: Map<string, any>, map2: Map<string, any>) {
  let testValue;
  if (map1.size !== map2.size) return false;
  for (let [key, value] of map1) {
    testValue = map2.get(key);
    if (testValue !== value || (testValue === undefined && !map2.has(key))) return false;
  }
  return true;
}

async function processPropertyValue(property: PropertyShape): Promise<string> {
  if (props.mode === EditorMode.EDIT) return "";
  if (isObjectHasKeys(property, ["isIri"])) {
    return property.isIri["@id"];
  }
  if (isObjectHasKeys(property, ["function", "argument"])) {
    const args = processArguments(property);
    const result = await queryService.runFunction(property.function["@id"], args);
    if (result) return result;
    else return "";
  }
  if (isObjectHasKeys(property, ["function"])) {
    const result = await queryService.runFunction(property.function["@id"]);
    if (result && isObjectHasKeys(result, ["iri"])) return result.iri["@id"];
  }
  throw new Error("Property must have isIri or function key");
}

function processArguments(property: PropertyShape) {
  const result = new Map<string, any>();
  property.argument.forEach(arg => {
    let key = "";
    let value: any;
    if (arg.parameter === "this") key = property.path["@id"];
    else key = arg.parameter;
    if (arg.valueIri) value = arg.valueIri;
    else if (arg.valueVariable) value = valueVariableMap?.value.get(arg.valueVariable);
    else if (arg.valueText) value = arg.valueText;
    result.set(key, value);
  });
  return result;
}

function updateEntity() {
  const result = {} as any;
  result[key] = userInput.value;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity() {
  if (isObjectHasKeys(props.shape, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(userInput, props.shape.validation["@id"]));
  } else {
    invalid.value = !defaultValidation();
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidation() {
  return true;
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