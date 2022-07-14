<template>
  <div class="string-container">
    <span class="p-float-label">
      <InputText class="p-inputtext-lg input-text" :id="id" :class="invalid && 'invalid'" v-model="userInput" type="text" />
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
import { stringify } from "querystring";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;

const props = defineProps({
  id: String,
  dataKey: { type: String, required: true },
  dataValue: { type: String, default: "" },
  label: { type: String, required: true },
  mode: { type: String, required: true },
  invalidEntity: { type: Boolean, required: true },
  validity: { type: Object as PropType<{ key: string; valid: boolean }[]>, required: true }
});

const emit = defineEmits({
  "entity-updated": (payload: any) => isObjectHasKeys(payload),
  "validity-updated": (payload: any) => isObjectHasKeys(payload, ["key", "valid"])
});

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
  updateValidity(props.dataKey, !newValue);
});

let userInput = ref(props.dataValue);
watch(userInput, newValue => {
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
  emit("validity-updated", { key: dataKey, valid: valid });
}
</script>

<style scoped></style>
