<template>
  <div class="set-definition-container">
    <SelectButton v-model="builderMode" :options="builderModeOptions" class="set-definition-mode-select" />
    <div class="set-definition-builder">
      <SetDefinitionForm v-if="builderMode === 'Form'" :clauses="clauses" />
      <SetDefinitionECL v-else="builderMode === 'ECL'" :ecl="ecl" @updateECL="updateECL" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, Ref, PropType, inject } from "vue";
import "vue-json-pretty/lib/styles.css";
import SetDefinitionForm from "./setDefinition/SetDefinitionForm.vue";
import SetDefinitionECL from "./setDefinition/SetDefinitionECL.vue";
import { Helpers, Enums, Services } from "im-library";
import { PropertyGroup, Refinement, SetQueryObject, TTAlias, Query } from "im-library/dist/types/interfaces/Interfaces";
import _ from "lodash";
import injectionKeys from "@/injectionKeys/injectionKeys";
import axios from "axios";
import { computed } from "@vue/reactivity";
const { isObjectHasKeys, isArrayHasLength } = Helpers.DataTypeCheckers;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Object as PropType<any>, required: false }
});

const setService = new Services.SetService(axios);

const builderMode: Ref<string> = ref("Form");
const imquery: Ref<Query> = ref({} as Query);
const ecl: Ref<string> = ref("");
const defaultTTAlias = { includeSubtypes: true } as TTAlias;
const clauses: Ref<SetQueryObject[]> = ref([]);
const builderModeOptions: Ref<string[]> = ref(["Form", "ECL"]);

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const key = props.shape.path["@id"];
const value = props.value ? JSON.parse(props.value) : {};

watch(ecl, async () => {
  if (builderMode.value === "ECL" && ecl.value) {
    const eclQuery = await setService.getQueryFromECL(ecl.value);
    if (eclQuery) {
      const constructedClauses = await setService.getSetQueryObjectFromQuery(eclQuery);
      clauses.value = constructedClauses;
    }
  }
});

watch(
  () => _.cloneDeep(clauses.value),
  async () => {
    imquery.value = await setService.getQueryFromSetQueryObject(clauses.value);
    if (builderMode.value === "Form") {
      const convertedECL = await setService.getECLFromQuery(imquery.value);
      if (convertedECL) {
        const isValid = await setService.isValidECL(convertedECL);
        if (isValid) {
          ecl.value = convertedECL;
        }
      }
    }
  }
);

watch(
  () => _.cloneDeep(imquery.value),
  async () => {
    updateEntity();
    updateValidity();
  }
);

onMounted(async () => {
  if (isObjectHasKeys(value)) {
    clauses.value = await setService.getSetQueryObjectFromQuery(value);
  } else addClause();
});

async function updateValidity() {
  if (validityUpdate) {
    validityUpdate({ key: key, valid: true });
  }
}

function updateEntity() {
  if (entityUpdate) {
    const result = {} as any;
    result[key] = JSON.stringify(imquery.value);
    entityUpdate(result);
  }
}

async function updateECL(data: string): Promise<void> {
  const isValid = await setService.isValidECL(data);
  if (isValid) ecl.value = data;
}

function addClause() {
  const newObject = {
    include: true,
    concept: { ...defaultTTAlias },
    refinements: [] as Refinement[]
  } as SetQueryObject;
  clauses.value.push(newObject);
}
</script>

<style scoped>
.set-definition-builder {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  overflow: auto;
}

.set-definition-container {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  overflow: auto;
}

.set-definition-mode-select {
  align-self: center;
  padding: 2rem;
}
</style>
