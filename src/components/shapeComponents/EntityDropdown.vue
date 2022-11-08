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
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape, TTIriRef, QueryRequest, Query } from "im-library/dist/types/interfaces/Interfaces";
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
  value: { type: Object as PropType<TTIriRef>, required: false },
  position: { type: Number, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMapUpdate = inject(injectionKeys.valueVariableMap)?.updateValueVariableMap;

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
    updateEntity(newValue);
    updateValueVariableMap(newValue);
    await updateValidity(newValue);
  }
});

let invalid = ref(false);

async function getDropdownOptions() {
  if (isObjectHasKeys(props.shape, ["select", "argument"])) {
    const args = processArguments(props.shape);
    const replacedArgs = mapToObject(args);
    const queryRequest = {} as QueryRequest;
    queryRequest.argument = replacedArgs;
    const query = { "@id": props.shape.select[0]["@id"] } as Query;
    queryRequest.query = query;
    const result = await queryService.queryIM(queryRequest);
    if (result)
      return result.entities.map((item: any) => {
        return { "@id": item.iri, name: item.name };
      });
    else return [];
  } else if (isObjectHasKeys(props.shape, ["function"])) {
    return (await queryService.runFunction(props.shape.function["@id"])).options.sort(byName);
  } else throw new Error("propertyshape is missing 'select' or 'function' parameter to fetch dropdown options");
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
  if (isObjectHasKeys(props.shape, ["validation"]) && editorEntity) {
    invalid.value = !(await queryService.checkValidation(props.shape.validation["@id"], editorEntity.value));
  } else {
    invalid.value = !defaultValidation(data);
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidation(data: TTIriRef) {
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
