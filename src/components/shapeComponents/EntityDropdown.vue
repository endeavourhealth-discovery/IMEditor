<template>
  <div class="entity-single-dropdown-container">
    <span class="p-float-label">
      <Dropdown class="entity-single-dropdown" :class="invalid && 'invalid'" v-model="selectedEntity" :options="dropdownOptions" optionLabel="name" />
      <label>{{ shape.name }}</label>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape, TTIriRef, QueryRequest } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
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
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Object as PropType<TTIriRef>, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

const dropdownOptions: Ref<TTIriRef[]> = ref([]);
onMounted(async () => {
  dropdownOptions.value = await getDropdownOptions();
  if (props.value) selectedEntity.value = props.value;
});

let key = props.shape.path["@id"];

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
  if (isObjectHasKeys(props.shape, ["select", "argument"])) {
    const args = processArguments(props.shape);
    const replacedArgs = mapToObject(args);
    const query = { argument: replacedArgs, queryIri: props.shape.select[0] } as QueryRequest;
    const result = await queryService.entityQuery(query);
    if (result)
      return result.map((item: any) => {
        return { "@id": item.iri, name: item.name };
      });
    else return [];
  } else if (isObjectHasKeys(props.shape, ["function"])) {
    return (await queryService.runFunction(props.shape.function["@id"])).options.sort(byName);
  } else throw new Error("propertyshape is missing 'select' or 'function' parameter to fetch dropdown options");
}

function updateEntity() {
  const result = {} as any;
  result[key] = selectedEntity.value;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity() {
  if (isObjectHasKeys(props.shape, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(selectedEntity.value, props.shape.validation["@id"]));
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
.entity-single-dropdown {
  width: 25rem;
}
.invalid {
  border-color: #e24c4c;
}
</style>
