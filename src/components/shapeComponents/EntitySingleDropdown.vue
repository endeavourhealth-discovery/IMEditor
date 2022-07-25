<template>
  <div class="entity-single-dropdown-container">
    <span class="p-float-label">
      <Dropdown class="entity-single-dropdown" :class="invalid && 'invalid'" v-model="selectedEntity" :options="dropdownOptions" optionLabel="name" />
      <label>{{ data.name }}</label>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import { Helpers, Services, Vocabulary } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
import { QueryRequest } from "im-library/dist/types/interfaces/modules/QueryRequest";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  TypeGuards: { isTTIriRef },
  Sorters: { byName },
  EditorMethods: { processArguments },
  Transforms: { mapToObject }
} = Helpers;
const { EntityService, QueryService } = Services;
const { IM } = Vocabulary;

const props = defineProps({
  data: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String, required: true },
  value: { type: Object as PropType<TTIriRef>, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

const dropdownOptions: Ref<TTIriRef[]> = ref([]);
onMounted(async () => {
  dropdownOptions.value = await getDropdownOptions();
});

let key = props.data.path["@id"];

let selectedEntity: Ref<TTIriRef | undefined> = ref();
onMounted(() => {
  if (props.value && isTTIriRef(props.value)) selectedEntity.value = props.value;
});
watch(selectedEntity, async newValue => {
  if (isTTIriRef(newValue)) {
    updateEntity();
    await updateValidity();
  }
});

let invalid = ref(false);

async function getDropdownOptions() {
  if (isObjectHasKeys(props.data, ["select", "argument"])) {
    const args = processArguments(props.data);
    const replacedArgs = mapToObject(args);
    const query = { argument: replacedArgs, queryIri: props.data.select[0] } as QueryRequest;
    const result = await queryService.entityQuery(query);
    if (result) return result;
    else return [];
  } else throw new Error("propertyshape is missing 'argument' or 'select' parameter to fetch dropdown options");
}

function updateEntity() {
  const result = {} as any;
  result[key] = selectedEntity.value;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity() {
  if (isObjectHasKeys(props.data, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(selectedEntity.value, props.data.validation["@id"]));
    if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
  } else {
    if (validityUpdate) validityUpdate({ key: key });
  }
}
</script>

<style scoped>
.entity-single-dropdown {
  width: 25rem;
}
.invalid {
  border-color: #e24c4c;
}
</style>
