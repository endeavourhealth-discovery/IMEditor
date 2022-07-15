<template>
  <div class="string-single-display-container">
    <span class="p-float-label">
      <InputText :disabled="!userRoles?.includes('IMAdmin')" class="p-inputtext-lg input-text" :class="invalid && 'invalid'" v-model="userInput" type="text" />
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
const userRoles = inject(injectionKeys.userRoles)?.value;

const queryService = new QueryService(axios);

let key = props.data.path["@id"];

let invalid = ref(false);

let userInput = ref(props.value);
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
  invalid.value = await queryService.checkValidation(props.data.validation["@id"]);
  if (validityUpdate) validityUpdate({ key: dataKey, valid: !invalid.value });
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
