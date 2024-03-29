<template>
  <div id="concept-empty-container" v-if="selectedConceptIri === 'http://endhealth.info/im#Favourites'">
    <Panel>
      <template #icons>
        <button class="p-panel-header-icon p-link mr-2" @click="closeBar">
          <span class="pi pi-times"></span>
        </button>
      </template>
      <template #header> Please select an item to display </template>
    </Panel>
  </div>
  <div id="concept-main-container" v-else>
    <Panel>
      <template #icons>
        <button class="p-panel-header-icon p-link mr-2" @click="closeBar">
          <span class="pi pi-times"></span>
        </button>
      </template>
      <template #header>
        <PanelHeader :types="types" :header="header" />
      </template>
      <div id="concept-content-dialogs-container">
        <div id="concept-panel-container">
          <TabView :lazy="true">
            <TabPanel header="Details">
              <div v-if="loading" class="loading-container" :style="contentHeight">
                <ProgressSpinner />
              </div>
              <div v-else class="concept-panel-content" id="definition-container" :style="contentHeight">
                <Definition :concept="concept" :configs="configs" :totalCount="totalCount" />
              </div>
            </TabPanel>
            <TabPanel v-if="terms" header="Terms">
              <div class="concept-panel-content" id="term-table-container" :style="contentHeight">
                <TermCodeTable :terms="terms" />
              </div>
            </TabPanel>
            <TabPanel header="Hierarchy position">
              <div class="concept-panel-content" id="secondary-tree-container" :style="contentHeight">
                <SecondaryTree :conceptIri="selectedConceptIri" />
              </div>
            </TabPanel>
          </TabView>
        </div>
      </div>
    </Panel>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, Ref, ref, watch } from "vue";
import Definition from "./infoSideBar/Definition.vue";
import PanelHeader from "./infoSideBar/PanelHeader.vue";
import _ from "lodash";
import { DefinitionConfig, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { Vocabulary, Helpers, Models, Services } from "im-library";
import { useRouter } from "vue-router";
import axios from "axios";
const { IM, RDF, RDFS } = Vocabulary;
const {
  ConceptTypeMethods: { isQuery },
  DataTypeCheckers: { isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight },
  Sorters: { byOrder }
} = Helpers;
const { ConfigService, EntityService, LoggerService } = Services;

const props = defineProps({
  selectedConceptIri: { type: String, required: true }
});

const emit = defineEmits({
  closeBar: () => true
});

watch(
  () => props.selectedConceptIri,
  async newValue => {
    if (newValue) await init();
  }
);

const router = useRouter();
const entityService = new EntityService(axios);
const configService = new ConfigService(axios);

let loading = ref(false);
let concept: Ref<any> = ref({});
let definitionText = ref("");
let types: Ref<TTIriRef[]> = ref([]);
let header = ref("");
let contentHeight = ref("");
let contentHeightValue = ref(0);
let configs: Ref<DefinitionConfig[]> = ref([]);
let conceptAsString = ref("");
let terms: Ref<any[] | undefined> = ref([]);
let profile = ref({} as Models.Query.Profile);
// let isQuery = ref(false);
let children: Ref<any> = ref({});
let totalCount = ref(0);

onMounted(async () => {
  setContentHeight();
  window.addEventListener("resize", onResize);
  await init();
  setContentHeight();
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});

function closeBar() {
  emit("closeBar");
}

function onResize(): void {
  setContentHeight();
}

function directToEditRoute(): void {
  router.push({
    name: "Edit",
    params: { iri: concept.value["@id"] }
  });
}

function directToCreateRoute(): void {
  router.push({ name: "Create" });
}

async function getConcept(iri: string): Promise<void> {
  const predicates = configs.value
    .filter((c: DefinitionConfig) => c.type !== "Divider")
    .filter((c: DefinitionConfig) => c.predicate !== "subtypes")
    .filter((c: DefinitionConfig) => c.predicate !== "inferred")
    .filter((c: DefinitionConfig) => c.predicate !== "termCodes")
    .filter((c: DefinitionConfig) => c.predicate !== "@id")
    .filter((c: DefinitionConfig) => c.predicate !== "None")
    .filter((c: DefinitionConfig) => c.predicate !== undefined)
    .map((c: DefinitionConfig) => c.predicate);
  predicates.push(IM.DEFINITION);

  concept.value = await entityService.getPartialEntity(iri, predicates);

  concept.value["@id"] = iri;
  children.value = await entityService.getPagedChildren(iri, 1, 10);
  totalCount.value = children.value["totalCount"];
  concept.value["subtypes"] = children.value.result;

  concept.value["termCodes"] = await entityService.getEntityTermCodes(iri);

  await hydrateDefinition();

  if (isQuery(concept.value[RDF.TYPE])) {
    profile.value = new Models.Query.Profile(concept.value);
  } else {
    profile.value = {} as Models.Query.Profile;
  }
}

async function hydrateDefinition() {
  if (concept.value[IM.DEFINITION]) {
    const def = concept.value[IM.DEFINITION];
    const iris: any[] = getIris(def);
    const ttiris = await entityService.getNames(iris.map(i => i["@id"]));

    setIriNames(iris, ttiris);

    concept.value[IM.DEFINITION] = JSON.stringify(def);
  }
}

function getIris(def: any): string[] {
  const result = [];
  for (const k of Object.keys(def)) {
    if (def[k]["@id"]) {
      result.push(def[k]);
    } else if (typeof def[k] === "object") {
      getIris(def[k]).forEach(i => result.push(i));
    }
  }
  return result;
}

function setIriNames(iris: TTIriRef[], ttIris: TTIriRef[]) {
  for (const i of iris) {
    const match = ttIris.find(t => t["@id"] === i["@id"]);
    if (match) {
      i["name"] = match.name;
    }
  }
}

async function getInferred(iri: string): Promise<void> {
  const result = await entityService.getDefinitionBundle(iri);
  if (isObjectHasKeys(result, ["entity"]) && isObjectHasKeys(result.entity, [RDFS.SUBCLASS_OF, IM.ROLE_GROUP])) {
    const roleGroup = result.entity[IM.ROLE_GROUP];
    delete result.entity[IM.ROLE_GROUP];
    const newRoleGroup: any = {};
    newRoleGroup[IM.ROLE_GROUP] = roleGroup;
    result.entity[RDFS.SUBCLASS_OF].push(newRoleGroup);
  }
  concept.value["inferred"] = result;
}

async function getConfig(): Promise<void> {
  const definitionConfig = await configService.getComponentLayout("definition");
  const summaryConfig = await configService.getComponentLayout("summary");
  configs.value = definitionConfig.concat(summaryConfig);

  if (configs.value.every(config => isObjectHasKeys(config, ["order"]))) {
    configs.value.sort(byOrder);
  } else {
    LoggerService.error(undefined, "Failed to sort config for definition component layout. One or more config items are missing 'order' property.");
  }
}

async function init(): Promise<void> {
  loading.value = true;
  await getConfig();
  await getConcept(props.selectedConceptIri);
  await getInferred(props.selectedConceptIri);
  await getTerms(props.selectedConceptIri);
  types.value = isObjectHasKeys(concept.value, [RDF.TYPE]) ? concept.value[RDF.TYPE] : ([] as TTIriRef[]);
  header.value = concept.value[RDFS.LABEL];
  loading.value = false;
}

async function getTerms(iri: string) {
  const entity = await entityService.getPartialEntity(iri, [IM.HAS_TERM_CODE]);
  terms.value = isObjectHasKeys(entity, [IM.HAS_TERM_CODE])
    ? (entity[IM.HAS_TERM_CODE] as []).map(term => {
        return { name: term[RDFS.LABEL], code: term[IM.CODE] };
      })
    : undefined;
}

function setContentHeight(): void {
  const calcHeight = getContainerElementOptimalHeight("concept-main-container", ["p-panel-header", "p-tabview-nav-container"], true, 4, 1);
  if (!calcHeight.length) {
    contentHeight.value = "height: 700px; max-height: 700px;";
    contentHeightValue.value = 800;
  } else {
    contentHeight.value = "height: " + calcHeight + ";" + "max-height: " + calcHeight + ";";
    contentHeightValue.value = parseInt(calcHeight, 10);
  }
}
</script>
<style scoped>
#concept-main-container {
  height: 100%;
  width: 100%;
}

.p-tabview-panel {
  min-height: 100%;
}

.p-panel {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  height: 100%;
}

.concept-panel-content {
  height: 100%;
  overflow: auto;
  background-color: #ffffff;
}

.copy-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.icons-container {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
}

.loading-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
}
</style>
