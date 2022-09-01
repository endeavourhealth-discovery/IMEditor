<template>
  <div class="entity-combobox-container">
    <div class="multiselect-loading-container">
      <span class="p-float-label">
        <MultiSelect
          :disabled="loading"
          class="multi-select"
          :class="invalid && 'invalid'"
          v-model="selectedEntities"
          :options="dropdownOptions"
          optionLabel="name"
          display="chip"
        />
        <label>{{ shape.name }}</label>
      </span>
      <ProgressSpinner v-if="loading" class="loading-icon" stroke-width="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import { Enums, Helpers, Services } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape, TTIriRef, QueryRequest } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  Sorters: { byName },
  EditorMethods: { processArguments },
  Transforms: { mapToObject }
} = Helpers;
const { EntityService, QueryService } = Services;

const props = defineProps({
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Array as PropType<TTIriRef[]>, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMapUpdate = inject(injectionKeys.valueVariableMap)?.updateValueVariableMap;

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

const dropdownOptions: Ref<TTIriRef[]> = ref([]);
onMounted(async () => {
  loading.value = true;
  dropdownOptions.value = await getDropdownOptions();
  if (props.value && isArrayHasLength(props.value)) selectedEntities.value = props.value;
  else if (isObjectHasKeys(props.shape, ["isIri"])) {
    const found = dropdownOptions.value.find(option => option["@id"] === props.shape.isIri["@id"]);
    if (found) selectedEntities.value = [found];
  }
  loading.value = false;
});

let key = props.shape.path["@id"];

let loading = ref(false);
let selectedEntities: Ref<TTIriRef[]> = ref([]);
watch(selectedEntities, async newValue => {
  if (isArrayHasLength(newValue)) {
    updateEntity(newValue);
    updateValueVariableMap(newValue);
    await updateValidity(newValue);
  }
});

let invalid = ref(false);

async function getDropdownOptions(): Promise<TTIriRef[]> {
  if (isObjectHasKeys(props.shape, ["select", "argument"])) {
    const args = processArguments(props.shape);
    const replacedArgs = mapToObject(args);
    const queryRequest = { argument: replacedArgs, queryIri: props.shape.select[0] } as QueryRequest;
    const result = await queryService.entityQuery(queryRequest);
    if (result)
      return result.map((item: any) => {
        return { "@id": item.iri, name: item.name };
      });
    else return [];
  } else if (isObjectHasKeys(props.shape, ["function", "argument"])) {
    const args = processArguments(props.shape);
    return await queryService.runFunction(props.shape.function["@id"], args);
  } else if (isObjectHasKeys(props.shape, ["function"])) {
    return await queryService.runFunction(props.shape.function["@id"]);
  } else throw new Error("propertyshape is missing 'search' or 'function' parameter to fetch dropdown options");
}

function updateEntity(data: TTIriRef) {
  const result = {} as any;
  result[key] = data;
  if (entityUpdate) entityUpdate(result);
}

function updateValueVariableMap(data: TTIriRef) {
  if (!props.shape.valueVariable) return;
  let mapKey = props.shape.valueVariable;
  if (props.shape.builderChild) mapKey = mapKey + props.shape.order;
  if (valueVariableMapUpdate) valueVariableMapUpdate(mapKey, data);
}

async function updateValidity(data: TTIriRef) {
  if (isObjectHasKeys(props.shape, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(props.shape.validation["@id"], data));
  } else {
    invalid.value = !defaultValidity(data);
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidity(data: TTIriRef) {
  return true;
}
</script>

<style scoped>
.multiselect-loading-container {
  display: flex;
  flex-flow: row nowrap;
  width: 25rem;
  align-items: center;
  height: fit-content;
}

.p-float-label {
  flex: 1 1 auto;
}

.multi-select {
  width: 100%;
}

.loading-icon {
  flex: 0 0 auto;
}

.p-progress-spinner {
  width: 2rem;
  height: 2rem;
}

.invalid {
  border-color: #e24c4c;
}
</style>
