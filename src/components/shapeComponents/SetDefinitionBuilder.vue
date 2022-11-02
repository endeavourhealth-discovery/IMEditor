<template>
  <div class="set-definition-builder">
    <SetDefinitionForm :clauses="clauses" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, Ref, PropType, inject } from "vue";
import "vue-json-pretty/lib/styles.css";
import SetDefinitionForm from "./SetDefinitionForm.vue";
import { Helpers, Enums } from "im-library";
import { PropertyGroup, Refinement, SetQueryObject, TTAlias, Query } from "im-library/dist/types/interfaces/Interfaces";
import _ from "lodash";
import injectionKeys from "@/injectionKeys/injectionKeys";
const { isObjectHasKeys, isArrayHasLength } = Helpers.DataTypeCheckers;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Object as PropType<any>, required: false }
});

const imquery: Ref<Query> = ref({} as Query);
const defaultTTAlias = { includeSubtypes: true } as TTAlias;
const clauses: Ref<SetQueryObject[]> = ref([]);

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const key = props.shape.path["@id"];
const value = props.value ? JSON.parse(props.value) : {};

watch(
  () => _.cloneDeep(clauses.value),
  () => {
    imquery.value = buildIMQuery(clauses.value);
  }
);

watch(
  () => _.cloneDeep(imquery.value),
  async newValue => {
    updateEntity();
    updateValidity();
  }
);

onMounted(() => {
  if (isObjectHasKeys(value)) getClauses(value);
  else addClause();
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

function getClauses(value: Query) {
  if (isArrayHasLength(value?.where?.from)) {
    for (const from of value.where.from) {
      const clause = { concept: from, include: true, refinements: [] } as SetQueryObject;
      clauses.value.push(clause);
    }
  }

  if (isArrayHasLength(value?.where?.notExist?.from)) {
    for (const from of value.where.notExist.from) {
      const clause = { concept: from, include: false, refinements: [] } as SetQueryObject;
      clauses.value.push(clause);
    }
  }

  if (isArrayHasLength(value?.where?.and)) {
    for (const and of value.where.and) {
      clauses.value[0].refinements.push({ property: and.property, is: and.is });
    }
  }
}

function buildIMQuery(clauses: SetQueryObject[]): any {
  const newQuery = {
    where: {
      from: [] as any[]
    }
  } as any;

  for (const clause of clauses) {
    if (clause.include) {
      if (!isObjectHasKeys(newQuery.where, ["from"])) {
        newQuery.where.from = [] as any;
      }
      newQuery.where.from.push(clause.concept);
    } else if (!clause.include) {
      if (!isObjectHasKeys(newQuery.where, ["notExists"])) {
        newQuery.where.notExist = {
          from: [] as any[]
        };
      }
      newQuery.where.notExist.from.push(clause.concept);
    }

    if (isArrayHasLength(clause.refinements)) {
      newQuery.where.path = "http://endhealth.info/im#roleGroup";
      newQuery.where.and = [] as any[];
    }

    for (const refinement of clause.refinements) {
      newQuery.where.and.push(refinement);
    }
  }
  return newQuery;
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
  justify-content: flex-start;
  overflow: auto;
}
</style>
