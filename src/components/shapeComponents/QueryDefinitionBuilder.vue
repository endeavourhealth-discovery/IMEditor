<template>
  <div class="query-builder-main-container">
    <QueryTree :queryNodes="queryNodes" :selectedNodeKey="selectedNodeKey" @selected="onSelect" />
    <div class="property-container">
      <div class="property-component" v-if="currentQueryObject.children?.length" v-for="(property, index) in currentQueryObject.children" :key="property.key">
        <PropertyInput
          :property="property"
          :parentType="currentQueryObject.type"
          :options="options"
          @changeCurrentObject="updateCurrentObject"
          @removeProperty="deleteProperty"
        />
      </div>
      <div class="property-component">
        <Button icon="pi pi-plus" label="Add" class="p-button-success one-rem-margin" @click="addProperty" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, Ref } from "vue";
import QueryTree from "./queryDefinition/QueryTree.vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { Helpers, Vocabulary, Services } from "im-library";
import { QueryObject, QueryRequest, SearchRequest, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import PropertyInput from "./queryDefinition/PropertyInput.vue";
import axios from "axios";
import _ from "lodash";
import { Query } from "im-library/dist/types/models/modules/AutoGen";
import { useToast } from "primevue/usetoast";
import { ToastMessageOptions } from "primevue/toast";
const { isObjectHasKeys, isArrayHasLength, isObject } = Helpers.DataTypeCheckers;
const { IM, RDFS, SHACL } = Vocabulary;
const { EntityService, QueryService, LoggerService } = Services;
const toast = useToast();

const entityService = new EntityService(axios);
const queryService = new QueryService(axios);
const abortController = ref(new AbortController());
const showDialog = ref(false);
const testQueryResults: Ref<TTIriRef[]> = ref([]);
const options = ref({
  status: [] as TTIriRef[],
  scheme: [] as TTIriRef[],
  type: [] as TTIriRef[],
  boolean: [
    { name: "True", value: true },
    { name: "False", value: false }
  ]
});
const selectedNodeKey = ref<number>(0);

onMounted(async () => {
  options.value.status = await searchByIsA([IM.STATUS]);
  options.value.scheme = await searchByIsA(["http://endhealth.info/im#Graph"]);
  options.value.type = await searchByIsA([RDFS.CLASS]);
});

async function searchByIsA(isA: string[]) {
  const searchRequest = {} as SearchRequest;
  searchRequest.isA = isA;
  if (!isObject(abortController.value)) {
    abortController.value.abort();
  }

  abortController.value = new AbortController();
  const results = await entityService.advancedSearch(searchRequest, abortController.value);
  return results.map(summary => {
    return { "@id": summary.iri, name: summary.name };
  });
}

const initNode = {
  key: 0,
  label: "query",
  type: {
    firstType: "org.endeavourhealth.imapi.model.iml.Query"
  },
  value: "",
  children: []
} as QueryObject;
const fullQuery = ref<QueryObject>(initNode);
const currentQueryObject = ref<QueryObject>(initNode);
const queryNodes = ref<any>({});
const imquery: Ref<Query> = ref({} as Query);

queryNodes.value = [fullQuery.value];

watch(
  () => _.cloneDeep(fullQuery.value),
  async (newVal, oldVal) => {
    imquery.value = buildIMQuery(newVal);
  }
);

function onSelect(nodeContents: any) {
  currentQueryObject.value = nodeContents;
}

function cancelChanges() {
  currentQueryObject.value = {} as QueryObject;
}

function saveChanges() {
  console.log("save");
}

function addProperty() {
  if (!isArrayHasLength(currentQueryObject.value.children)) {
    currentQueryObject.value.children = [];
  }
  currentQueryObject.value.children!.push({ key: Math.floor(Math.random() * 9999999999999999), selectable: false } as QueryObject);
}

function updateCurrentObject(newQueryObject: QueryObject) {
  currentQueryObject.value = newQueryObject;
  selectedNodeKey.value = newQueryObject.key;
}

function deleteProperty(propertyKey: number) {
  currentQueryObject.value.children = currentQueryObject.value.children?.filter(property => property.key !== propertyKey);
}

async function handleClick() {
  await navigator.clipboard.writeText(JSON.stringify(imquery.value));
  toast.add(LoggerService.success("Value copied to clipboard") as ToastMessageOptions);
}

async function testQuery() {
  const result = await queryService.queryIM(imquery.value as unknown as QueryRequest);
  if (isArrayHasLength(result.entities)) {
    testQueryResults.value = await entityService.getNames(result.entities.map(entity => entity["@id"]));
  }
  showDialog.value = true;
}

function buildIMQuery(queryObject: QueryObject) {
  const imquery = {} as Query;
  buildRecursively(queryObject, imquery);
  return imquery;
}

function buildRecursively(queryObject: QueryObject, imquery: any) {
  if (isObjectHasKeys(queryObject) && isObject(imquery)) {
    if (isArrayHasLength(queryObject.children)) {
      imquery[queryObject.label] = queryObject.type.secondType === "java.util.List" ? [] : {};
      for (const child of queryObject.children!) {
        buildRecursively(child, imquery[queryObject.label]);
      }
    } else if (isObjectHasKeys(queryObject, ["value"])) {
      imquery[queryObject.label] = queryObject.value;
    }
  } else if (isObjectHasKeys(queryObject) && Array.isArray(imquery)) {
    if (isArrayHasLength(queryObject.children)) {
      const value = {} as any;
      value[queryObject.label] = queryObject.type.secondType === "java.util.List" ? [] : {};
      imquery.push(value);
      for (const child of queryObject.children!) {
        buildRecursively(child, imquery);
      }
    } else if (isObjectHasKeys(queryObject, ["value"])) {
      imquery.push(queryObject.value);
    }
  }
}
</script>

<style scoped>
.query-builder-main-container {
  display: flex;
  flex-flow: row nowrap;
  height: 100%;
}

.tab-content-container {
  padding: 1rem;
  display: flex;
  flex-flow: column nowrap;
  justify-content: space-between;
  height: calc(100vh - 8.7rem);
}

.property-component {
  display: flex;
  flex-flow: row wrap;
  align-items: baseline !important;
  justify-content: center;
  padding: 0.5rem;
}

.footer-buttons {
  display: flex;
  flex-flow: row nowrap;
  justify-content: end;
}

.tab-view-container {
  flex: 1 0;
  height: 100%;
}

.one-rem-margin {
  margin-right: 0.1rem;
}

.p-tree {
  height: 100%;
}

.p-card {
  padding-left: 1rem;
  padding-right: 1rem;
  box-shadow: none;
}

.tab-panel {
  height: 100%;
}

.json {
  overflow-y: auto;
  height: calc(100vh - 8.7rem);
}
</style>
