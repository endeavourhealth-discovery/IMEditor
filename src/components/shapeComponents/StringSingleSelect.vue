<template>
  <div class="string-single-select-container">
    <span class="p-float-label">
      <InputText class="p-inputtext-lg input-text" :class="invalid && 'invalid'" v-model="userInput" type="text" />
      <label>{{ data.name }}</label>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType } from "vue";
import store from "@/store";
import axios from "axios";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { PropertyShape } from "im-library/dist/types/interfaces/Interfaces";
import { Helpers, Services } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { QueryService } = Services;

const props = defineProps({
  data: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String, required: true },
  value: { type: String, default: "" }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);

let key = props.data.path["@id"];

let invalid = ref(false);

let userInput = ref("");
onMounted(() => {
  if (props.value) userInput.value = props.value;
});
watch(
  () => props.value,
  newValue => {
    if (newValue) userInput.value = newValue;
  }
);
watch(userInput, async newValue => {
  updateEntity(newValue);
  await updateValidity(newValue);
});

function updateEntity(data: any) {
  const result = {} as any;
  result[key] = data;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity(dataKey: string) {
  if (isObjectHasKeys(props.data, ["validation"])) invalid.value = !(await queryService.checkValidation(userInput, props.data.validation["@id"]));
  else invalid.value = !defaultValidation(userInput.value);
  if (validityUpdate) validityUpdate({ key: dataKey, valid: !invalid.value });
}

function defaultValidation(string: string) {
  return string.length < 50;
}
</script>

<style scoped>
.input-text {
  width: 20rem;
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
