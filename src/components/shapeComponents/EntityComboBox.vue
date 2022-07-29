<template>
  <div class="entity-combobox-container">
    <span class="p-float-label">
      <MultiSelect
        :disabled="props.data.path['@id'] === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' && mode === 'create'"
        class="multi-select"
        :class="invalid && 'invalid'"
        v-model="selectedEntities"
        :options="dropdownOptions"
        optionLabel="name"
        display="chip"
      />
      <label>{{ data.name }}</label>
    </span>
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
  data: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Array as PropType<TTIriRef[]>, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

const dropdownOptions: Ref<TTIriRef[]> = ref([]);
onMounted(async () => {
  dropdownOptions.value = await getDropdownOptions();
  if (props.value && isArrayHasLength(props.value)) selectedEntities.value = props.value;
  else if (isObjectHasKeys(props.data, ["isIri"])) {
    const found = dropdownOptions.value.find(option => option["@id"] === props.data.isIri["@id"]);
    if (found) selectedEntities.value = [found];
  }
});

let key = props.data.path["@id"];

let selectedEntities: Ref<TTIriRef[]> = ref([]);
watch(selectedEntities, async newValue => {
  if (isArrayHasLength(newValue)) {
    updateEntity();
    await updateValidity();
  }
});

let invalid = ref(false);

async function getDropdownOptions(): Promise<TTIriRef[]> {
  if (isObjectHasKeys(props.data, ["select", "argument"])) {
    const args = processArguments(props.data);
    const replacedArgs = mapToObject(args);
    const queryRequest = { argument: replacedArgs, queryIri: props.data.select[0] } as QueryRequest;
    const result = await queryService.entityQuery(queryRequest);
    if (result)
      return result.map((item: any) => {
        return { "@id": item.iri, name: item.name };
      });
    else return [];
  } else if (isObjectHasKeys(props.data, ["function"])) {
    return (await queryService.runFunction(props.data.function["@id"])).options.sort(byName);
  } else throw new Error("propertyshape is missing 'search' or 'function' parameter to fetch dropdown options");
}

function updateEntity() {
  const result = {} as any;
  result[key] = selectedEntities.value;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity() {
  if (isObjectHasKeys(props.data, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(selectedEntities.value, props.data.validation["@id"]));
  } else {
    invalid.value = !defaultValidity();
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidity() {
  return true;
}
</script>

<style scoped>
.entity-combobox-container,
.multi-select {
  width: 25rem;
}
.invalid {
  border-color: #e24c4c;
}
</style>
