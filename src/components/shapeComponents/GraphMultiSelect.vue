<template>
  <div class="graph-select-container">
    <span class="p-float-label">
      <Dropdown class="graph-dropdown" :id="id" :class="invalid && 'invalid'" v-model="graph" :options="graphOptions" optionLabel="name" />
      <label :for="id">{{ label }}</label>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import { Helpers } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;

const props = defineProps({
  id: String,
  dataKey: { type: String, required: true },
  dataValue: { type: Object as PropType<TTIriRef[]>, default: [] },
  label: { type: String, required: true },
  mode: { type: String, required: true },
  invalidEntity: { type: Boolean, required: true },
  validity: { type: Object as PropType<{ key: string; valid: boolean }[]>, required: true }
});

const emit = defineEmits({
  "entity-updated": (payload: any) => isObjectHasKeys(payload),
  "validity-updated": (payload: any) => isObjectHasKeys(payload, ["key", "valid"])
});

const graphOptions = computed(() =>
  store.state.filterOptions.schemes.map(item => {
    return { "@id": item.iri, name: item.name };
  })
);

let key = props.dataKey;

watch(
  () => props.invalidEntity,
  newValue => {
    if (newValue) {
      setInvalidInputs(props.validity);
    }
  }
);

let invalid = ref(false);
watch(invalid, newValue => {
  updateValidity(props.dataKey, newValue);
});

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
  emit("entity-updated", result);
}

function updateValidity(dataKey: string, valid: boolean) {
  emit("validity-updated", { key: dataKey, vaild: valid });
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
