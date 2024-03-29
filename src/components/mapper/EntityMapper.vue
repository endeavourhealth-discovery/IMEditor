<template>
  <div class="entity-mapper-container">
    <h5>Map: {{ taskName }}</h5>
    <div class="grid">
      <div class="col-4">
        <SecondaryTree v-if="taskIri" :conceptIri="taskIri" />
      </div>
      <div class="col-8">
        <OverlayPanel ref="summary_overlay" id="summary_overlay_panel" style="width: 50vw" :breakpoints="{ '960px': '75vw' }">
          <OverlaySummary :hoveredResult="hoveredItem" />
        </OverlayPanel>
        <div class="grid">
          <div class="col-12 suggestion-table">
            <div class="col-12">
              <Panel header="Search filters" :toggleable="false">
                <div class="grid justify-content-between">
                  <MultiSelect
                    class="col-3"
                    v-model="selectedFilters.scheme"
                    :options="filterOptions.schemes"
                    optionLabel="name"
                    optionValue="iri"
                    placeholder="Select scheme"
                  />
                  <MultiSelect
                    class="col-2"
                    v-model="selectedFilters.type"
                    :options="filterOptions.types"
                    optionLabel="name"
                    optionValue="@id"
                    placeholder="Select type"
                  />
                  <MultiSelect
                    class="col-2"
                    v-model="selectedFilters.status"
                    :options="filterOptions.status"
                    optionLabel="name"
                    optionValue="@id"
                    placeholder="Select status"
                  />
                  <InputText class="col-3" v-model="searchTerm" placeholder="Keyword Search" />
                  <Button class="col-2 save-button" :loading="loading" icon="pi pi-search" label="Search" @click="search()" />
                </div>
              </Panel>
            </div>
            <h5>Suggestions</h5>
            <DataTable
              class="p-datatable-sm"
              v-model:selection="selectedSuggestions"
              dataKey="iri"
              :value="suggestions"
              responsiveLayout="scroll"
              :loading="false"
              selectionMode="multiple"
              @row-dblclick="addToMappings"
            >
              <template #empty> No results found. </template>
              <template #loading> Loading results. </template>
              <Column field="name" header="Name">
                <template #body="{ data }">
                  <div class="hover-name" @mouseenter="showOverlay($event, data)" @mouseleave="hideOverlay()">
                    {{ data.name }}
                  </div>
                </template>
              </Column>
              <Column field="usage" header="Usage"> </Column>
              <Column>
                <template #body="{ data }">
                  <div class="buttons-container">
                    <Button
                      icon="pi pi-fw pi-eye"
                      class="p-button-rounded p-button-text p-button-plain row-button"
                      @click="view(data.iri)"
                      v-tooltip.top="'View'"
                    />
                    <Button
                      icon="pi pi-fw pi-info-circle"
                      class="p-button-rounded p-button-text p-button-plain row-button"
                      @click="showInfo(data.iri)"
                      v-tooltip.top="'Info'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
          <div class="col-12">
            <div class="grid">
              <div class="col-offset-4 center-button"><Button class="pick-button" icon="pi pi-arrow-down" @click="addSelected" /></div>
              <div class="col-offset-3 center-button"><Button class="pick-button" icon="pi pi-arrow-up" @click="removeSelected" /></div>
            </div>
          </div>
          <div class="col-12 mappings-table">
            <h5>Mappings</h5>
            <DataTable
              class="p-datatable-sm"
              v-model:selection="selectedMappings"
              dataKey="iri"
              :value="mappings"
              responsiveLayout="scroll"
              :loading="false"
              selectionMode="multiple"
            >
              <template #empty> No results found. </template>
              <template #loading> Loading results. </template>
              <Column field="name" header="Name">
                <template #body="{ data }">
                  <div class="hover-name" @mouseenter="showOverlay($event, data)" @mouseleave="hideOverlay()">
                    {{ data.name }}
                  </div>
                </template>
              </Column>
              <Column field="usage" header="Usage"> </Column>
              <Column>
                <template #body="{ data }">
                  <div class="buttons-container">
                    <Button
                      icon="pi pi-fw pi-eye"
                      class="p-button-rounded p-button-text p-button-plain row-button"
                      @click="view(data.iri)"
                      v-tooltip.top="'View'"
                    />
                    <Button
                      icon="pi pi-fw pi-info-circle"
                      class="p-button-rounded p-button-text p-button-plain row-button"
                      @click="showInfo(data.iri)"
                      v-tooltip.top="'Info'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="button-bar">
    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
    <Button :loading="saveLoading" icon="pi pi-check" label="Save mappings" class="save-button" @click="saveMappings" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, onMounted, reactive, ref, Ref } from "vue";
import { mapState, useStore } from "vuex";
import { Vocabulary, Helpers, Models, Enums, Config, Services } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import axios from "axios";
import { Namespace, EntityReferenceNode, TTIriRef, ConceptSummary, SearchRequest } from "im-library/dist/types/interfaces/Interfaces";
import DirectService from "@/services/DirectService";
import { useRoute } from "vue-router";
import { useToast } from "primevue/usetoast";
const {
  ConceptTypeMethods: { getNamesAsStringFromTypes },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { SortBy } = Enums;
const { Env, EntityService, LoggerService } = Services;

const emit = defineEmits({
  showDetails: (_payload: string) => true
});

const route = useRoute();
const entityService = new EntityService(axios);
const store = useStore();
const toast = useToast();

const filterOptions = computed(() => store.state.filterOptions);

let actions: Ref<any[]> = ref([]);
let taskIri = ref("");
let taskName = ref("");
let searching = ref(false);
let searchTerm = ref("");
let searchResults: Ref<any[]> = ref([]);
let request: Ref<{ cancel: any; msg: string }> = ref({} as { cancel: any; msg: string });
let suggestions: Ref<any[]> = ref([]);
let selectedSuggestions: Ref<any[]> = ref([]);
let selectedMappings: Ref<any[]> = ref([]);
let mappings: Ref<any[]> = ref([]);
let loading = ref(false);
let saveLoading = ref(false);
let hoveredResult: Ref<ConceptSummary> = ref({} as ConceptSummary);
let controller: Ref<AbortController> = ref({} as AbortController);
let hoveredItem = ref({} as any);
const selectedFilters = reactive({
  scheme: Config.FilterDefaults.schemeOptions,
  type: [Vocabulary.IM.CONCEPT],
  status: [],
  usage: undefined
});

const summary_overlay = ref();

onMounted(async () => {
  taskIri.value = route.params.taskIri as string;
  if (taskIri.value) {
    taskName.value = (await entityService.getPartialEntity(taskIri.value, [Vocabulary.RDFS.LABEL]))[Vocabulary.RDFS.LABEL];
    await getMappings();
    await getMappingSuggestions(taskIri.value, taskName.value);
  }
});

async function saveMappings() {
  saveLoading.value = true;
  const mappingsMap = {} as any;
  const mappingIris = [] as string[];
  for (const mapping of mappings.value) {
    mappingIris.push(mapping.iri);
  }
  mappingsMap[taskIri.value] = mappingIris;
  try {
    await entityService.saveMapping(mappingsMap);
    toast.add(LoggerService.success("Mappings were saved"));
  } catch (error) {
    toast.add(LoggerService.error("Mappings were not saved"));
  }
  saveLoading.value = false;
}

function view(iri: string) {
  if (iri) DirectService.directTo(Env.VIEWER_URL, iri, this, "concept");
}

function showInfo(iri: string) {
  if (iri) emit("showDetails", iri);
}

function hideOverlay(): void {
  const x = summary_overlay.value as any;
  x.hide();
}

async function getMappings() {
  mappings.value = [];
  const results = (await entityService.getPartialEntity(taskIri.value, [Vocabulary.IM.MATCHED_TO]))[Vocabulary.IM.MATCHED_TO] as any[];
  if (Helpers.DataTypeCheckers.isArrayHasLength(mappings))
    mappings.value = results.map(mapping => {
      return {
        iri: mapping["@id"],
        name: mapping.name
      };
    });
}

function addToMappings(row: any) {
  const found = mappings.value.find(mapping => mapping.iri === row.data.iri);
  if (!found) {
    mappings.value.push(row.data);
  }
}

function showOverlay(event: any, data: ConceptSummary): void {
  hoveredItem.value = data;
  const x = summary_overlay.value as any;
  x.show(event, event.target);
}

function addSelected() {
  for (const selected of selectedSuggestions.value) {
    const found = mappings.value.find(mapping => mapping.iri === selected.iri);
    if (!found) {
      mappings.value.push(selected);
    }
  }
}

function removeSelected() {
  for (const selected of selectedMappings.value) {
    const foundIndex = mappings.value.findIndex(mapping => mapping.iri === selected.iri);
    if (foundIndex !== -1) {
      mappings.value.splice(foundIndex, 1);
    }
  }
}

async function getMappingSuggestions(iri: string, term: string) {
  loading.value = true;
  const searchRequest = await prepareSearchRequest(term);
  controller.value = new AbortController();
  let results = await entityService.getMappingSuggestions(searchRequest, controller.value);
  const i = results.findIndex(entity => entity.iri === iri);
  if (i !== -1) {
    results.splice(i, 1);
  }
  suggestions.value = results.length ? results : [];
  loading.value = false;
}

async function prepareSearchRequest(term: string) {
  searchResults.value = [];
  const searchRequest = {} as SearchRequest;
  searchRequest.termFilter = term;
  searchRequest.sortBy = SortBy.Usage;
  searchRequest.page = 1;
  searchRequest.size = 100;
  setFilters(searchRequest);
  if (isObjectHasKeys(request.value, ["cancel", "msg"])) {
    await request.value.cancel({ status: 499, message: "Search cancelled by user" });
  }
  const axiosSource = axios.CancelToken.source();
  request.value = { cancel: axiosSource.cancel, msg: "Loading..." };
  return searchRequest;
}

async function search(): Promise<void> {
  searching.value = true;
  if (searchTerm.value.length > 0) {
    searchResults.value = [];
    const searchRequest = {} as SearchRequest;
    searchRequest.termFilter = searchTerm.value;
    searchRequest.sortBy = SortBy.Usage;
    searchRequest.page = 1;
    searchRequest.size = 100;
    setFilters(searchRequest);
    if (!Helpers.DataTypeCheckers.isObject(controller.value)) {
      controller.value.abort();
    }
    controller.value = new AbortController();
    await fetchSearchResults(searchRequest, controller.value);
  } else {
    await getMappingSuggestions(taskIri.value, taskName.value);
  }
  searching.value = false;
}

function setFilters(searchRequest: SearchRequest) {
  searchRequest.schemeFilter = selectedFilters.scheme;
  searchRequest.statusFilter = selectedFilters.status;
  searchRequest.typeFilter = selectedFilters.type;
}

async function fetchSearchResults(searchRequest: SearchRequest, controller: AbortController) {
  const result = await entityService.advancedSearch(searchRequest, controller);
  if (result && isArrayHasLength(result)) {
    searchResults.value = result.map(item => {
      return { iri: item.iri, name: item.name, type: item.entityType, scheme: item.scheme, status: item.status, usage: item.weighting };
    });
  } else {
    searchResults.value = [];
  }
  suggestions.value = searchResults.value;
}

function getConceptTypes(types: TTIriRef[]): string {
  return getNamesAsStringFromTypes(types);
}
</script>

<style scoped>
.suggestion-table {
  overflow: auto;
  height: calc(100vh - 50rem);
}
.mappings-table {
  overflow: auto;
  height: calc(100vh - 50rem);
}
.entity-mapper-container {
  width: 100%;
  padding: 2rem 2rem 0 2rem;
  overflow: auto;
  position: relative;
  background-color: #ffffff;
  height: calc(100vh - 8rem);
}
.button-bar {
  flex: 0 1 auto;
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid #dee2e6;
  border-left: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  display: flex;
  flex-flow: row;
  justify-content: flex-end;
}
</style>
