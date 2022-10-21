<template>
  <div class="query-builder-main-wrapper">
    <div class="query-builder-main-container">
      <TabView ref="tabview">
        <TabPanel header="Edit">
          <div class="tab-content-container">
            <div class="property-container"><SetDefinitionForm :clauses="clauses" /></div>
          </div>
        </TabPanel>
        <TabPanel header="IM query">
          <div class="tab-panel"><vue-json-pretty class="json" :path="'res'" :show-length="true" :data="imquery" /></div>
        </TabPanel>
      </TabView>

      <Dialog
        :header="queryLoading ? 'Results' : 'Results: ' + testQueryResults.length"
        v-model:visible="showDialog"
        :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
        :style="{ width: '50vw' }"
      >
        <div v-if="queryLoading" class="flex flex-row justify-contents-center align-items-center loading-container">
          <ProgressSpinner />
        </div>
        <div v-else-if="!queryLoading && isArrayHasLength(testQueryResults)">
          <div v-for="iriRef of testQueryResults">
            <IMViewerLink :iri="iriRef['@id']" :label="iriRef.name" />
          </div>
        </div>
        <div v-else>No concepts found</div>
        <template #footer>
          <Button label="OK" icon="pi pi-check" @click="showDialog = false" autofocus />
        </template>
      </Dialog>
    </div>
    <div class="footer-buttons">
      <Button icon="pi pi-bolt" v-tooltip="'Test query'" class="test-button p-button-help one-rem-margin" @click="testQuery" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, Ref } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import SetDefinitionForm from "./SetDefinitionForm.vue";
import { Helpers, Vocabulary, Services } from "im-library";
import { QueryObject, QueryRequest, Refinement, SearchRequest, SetQueryObject, TTAlias, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
import _ from "lodash";
import { Query } from "im-library/dist/types/models/modules/AutoGen";
import { useToast } from "primevue/usetoast";
const { isObjectHasKeys, isArrayHasLength, isObject } = Helpers.DataTypeCheckers;
const { IM, RDFS, SHACL } = Vocabulary;
const { EntityService, QueryService, LoggerService } = Services;
const toast = useToast();

const entityService = new EntityService(axios);
const queryService = new QueryService(axios);
const testQueryResults: Ref<TTIriRef[]> = ref([]);
const showDialog: Ref<boolean> = ref(false);
const imquery: Ref<Query> = ref({} as Query);
const defaultTTAlias = { includeSubtypes: true } as TTAlias;
const clauses: Ref<SetQueryObject[]> = ref([]);
const queryLoading: Ref<boolean> = ref(false);

watch(
  () => _.cloneDeep(clauses.value),
  () => {
    imquery.value = buildIMQuery(clauses.value);
  }
);

onMounted(() => {
  addConcept();
});

function buildIMQuery(clauses: SetQueryObject[]): any {
  const imquery = {
    where: {
      from: [] as any[]
    }
  } as any;

  for (const clause of clauses) {
    if (clause.include) {
      if (!isObjectHasKeys(imquery.where, ["from"])) {
        imquery.where.from = [] as any;
      }
      imquery.where.from.push(clause.concept);
    } else if (!clause.include) {
      if (!isObjectHasKeys(imquery.where, ["notExists"])) {
        imquery.where.notExist = {
          from: [] as any[]
        };
      }
      imquery.where.notExist.from.push(clause.concept);
    }

    if (isArrayHasLength(clause.refinements)) {
      imquery.where.path = "http://endhealth.info/im#roleGroup";
      imquery.where.and = [] as any[];
    }

    for (const refinement of clause.refinements) {
      imquery.where.and.push(refinement);
    }
  }
  return { query: imquery };
}

function addConcept() {
  const newObject = {
    include: true,
    concept: { ...defaultTTAlias },
    refinements: [] as Refinement[]
  } as SetQueryObject;
  clauses.value.push(newObject);
}

async function testQuery() {
  queryLoading.value = true;
  showDialog.value = true;
  const result = await queryService.queryIM(imquery.value as unknown as QueryRequest);
  if (isArrayHasLength(result.entities)) {
    testQueryResults.value = await entityService.getNames(result.entities.map(entity => entity["@id"]));
  }
  queryLoading.value = false;
}
</script>

<style scoped>
.query-builder-main-container {
  display: flex;
  flex-flow: row nowrap;
  height: 100%;
}

.query-builder-main-wrapper {
  display: flex;
  flex-flow: column nowrap;
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
  height: calc(100vh - 11.2rem);
}

.tab-content-container {
  padding: 1rem;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  overflow: scroll;
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
  background-color: #ffffff;
}

.test-button {
  position: fixed;
  align-self: baseline;
}

.p-tabview {
  flex: 1 0;
  height: 100%;
}

.one-rem-margin {
  margin-right: 0.1rem;
}

.p-tree {
  height: 100%;
}
</style>
