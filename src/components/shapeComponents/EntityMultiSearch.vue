<template>
  <div class="terminology-concept-search-select-container">
    <span class="p-float-label">
      <Dropdown class="type-dropdown" :class="invalid && 'invalid'" v-model="graph" :options="typeOptions" optionLabel="name" />
      <label>{{ data.label }}</label>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import { Helpers, Services } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { QueryService } = Services;

const props = defineProps({
  data: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String, required: true },
  value: { type: Array as PropType<TTIriRef[]>, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);

const typeOptions = computed(() =>
  store.state.filterOptions.types.map(item => {
    return { "@id": item["@id"], name: item.name };
  })
);

let key = props.data.path["@id"];

let selectedConcepts: Ref<TTIriRef[]> = ref([]);
onMounted(() => {
  if (props.value && isArrayHasLength(props.value)) selectedConcepts.value = props.value;
});
watch(selectedConcepts, async newValue => {
  if (isArrayHasLength(newValue)) {
    updateEntity(newValue);
    await updateValidity(newValue);
  }
});

let invalid = ref(false);

let graph = ref(props.dataValue);
watch(graph, newValue => {
  updateEntity(newValue);
});

function setInvalidInputs(validities: { key: string; valid: boolean }[]): void {
  const found = validities.find((item: { key: string; valid: boolean }) => item.key === key);
  if (found) invalid.value = found.valid;
  else invalid.value = false;
}

function updateEntity(data: any) {
  const result = {} as any;
  result[key] = data;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity(dataKey: string, valid: boolean) {
  invalid.value = await queryService.checkValidation();
  if (validityUpdate) updateValidity({ key: dataKey, vaild: valid });
}
</script>

<style scoped>
.activity-status-container {
  width: 100%;
}
.invalid {
  border-color: #e24c4c;
}
</style>
