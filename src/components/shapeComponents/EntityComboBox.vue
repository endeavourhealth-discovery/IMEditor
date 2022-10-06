<template>
  <div class="entity-combobox-container">
    <div class="multiselect-loading-container">
      <span class="field">
        <label for="chip-group">{{ shape.name }}</label>
        <div id="chip-group" class="chip-group">
          <Chip v-if="fixedOption" :label="fixedOption.name" class="fixed-chip" />
          <MultiSelect
            :disabled="loading"
            class="multi-select"
            :class="invalid && 'invalid'"
            v-model="selectedEntities"
            :options="dropdownOptions"
            optionLabel="name"
            display="chip"
          />
        </div>
      </span>
      <ProgressSpinner v-if="loading" class="loading-icon" stroke-width="8" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, onMounted, inject, PropType } from "vue";
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import injectionKeys from "@/injectionKeys/injectionKeys";
import { PropertyShape, TTIriRef, QueryRequest, Query } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";

const { RDFS } = Vocabulary;

const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
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
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMapUpdate = inject(injectionKeys.valueVariableMap)?.updateValueVariableMap;

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

const dropdownOptions: Ref<TTIriRef[]> = ref([]);
const fixedOption: Ref<TTIriRef> = ref({} as TTIriRef);
const loading = ref(false);
const selectedEntities: Ref<TTIriRef[]> = ref([]);

let key = props.shape.path["@id"];

watch(selectedEntities, async newValue => {
  if (isArrayHasLength(newValue)) {
    updateEntity(newValue);
    updateValueVariableMap(newValue);
    await updateValidity(newValue);
  }
});

onMounted(async () => {
  loading.value = true;
  dropdownOptions.value = await getDropdownOptions();

  if (props.value && isArrayHasLength(props.value)) selectedEntities.value = props.value;

  if (isObjectHasKeys(props.shape, ["isIri"])) processFixedValue();

  loading.value = false;
});

function processFixedValue() {
  fixedOption.value = props.shape.isIri;
  dropdownOptions.value = dropdownOptions.value.filter(o => o["@id"] != fixedOption.value["@id"]);
  selectedEntities.value = selectedEntities.value.filter(o => o["@id"] != fixedOption.value["@id"]);

  if (!props.value || !props?.value.find(p => p["@id"] === fixedOption.value["@id"])) {
    let update: any = {};
    update[key] = props.value ? props.value.concat(fixedOption.value) : [fixedOption.value];
    if (entityUpdate) entityUpdate(update);
  }
}

let invalid = ref(false);

async function getDropdownOptions(): Promise<TTIriRef[]> {
  if (isObjectHasKeys(props.shape, ["select", "argument"])) {
    const args = processArguments(props.shape);
    const replacedArgs = mapToObject(args);
    const queryRequest = {} as QueryRequest;
    const query = {} as Query;
    query["@id"] = props.shape.select[0]["@id"];
    queryRequest.argument = replacedArgs;
    queryRequest.query = query;
    const result = await queryService.queryIM(queryRequest);
    if (result)
      return result.entities.map((item: any) => {
        return { "@id": item["@id"], name: item[RDFS.LABEL] };
      });
    else return [];
  } else if (isObjectHasKeys(props.shape, ["function", "argument"])) {
    const args = processArguments(props.shape);
    return queryService.runFunction(props.shape.function["@id"], args);
  } else if (isObjectHasKeys(props.shape, ["function"])) {
    return queryService.runFunction(props.shape.function["@id"]);
  } else throw new Error("propertyshape is missing 'search' or 'function' parameter to fetch dropdown options");
}

function updateEntity(data: TTIriRef[]) {
  const result = {} as any;
  result[key] = data;
  if (entityUpdate) entityUpdate(result);
}

function updateValueVariableMap(data: TTIriRef[]) {
  if (!props.shape.valueVariable) return;
  let mapKey = props.shape.valueVariable;
  if (props.shape.builderChild) mapKey = mapKey + props.shape.order;
  if (valueVariableMapUpdate) valueVariableMapUpdate(mapKey, data);
}

async function updateValidity(data: TTIriRef[]) {
  if (isObjectHasKeys(props.shape, ["validation"]) && editorEntity) {
    invalid.value = !(await queryService.checkValidation(props.shape.validation["@id"], editorEntity.value));
  } else {
    invalid.value = !defaultValidity(data);
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidity(data: TTIriRef[]) {
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

.field {
  width: 100%;
}

.chip-group {
  display: flex;
  width: 100%;
}

.fixed-chip {
  flex-basis: content;
  flex: 0 0 auto;
}

.multi-select {
  flex: 1 1 auto;
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
