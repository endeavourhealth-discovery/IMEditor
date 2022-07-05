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

<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Models, Enums, Config } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import axios from "axios";
import { Namespace, EntityReferenceNode, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import DirectService from "@/services/DirectService";

const {
  ConceptTypeMethods: { getNamesAsStringFromTypes },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { SortBy } = Enums;

export default defineComponent({
  name: "EntityMapper",
  computed: {
    ...mapState(["filterOptions"])
  },
  emits: {
    showDetails: (_payload: string) => true
  },

  async mounted() {
    this.taskIri = this.$route.params.taskIri as string;
    if (this.taskIri) {
      this.taskName = (await this.$entityService.getPartialEntity(this.taskIri, [Vocabulary.RDFS.LABEL]))[Vocabulary.RDFS.LABEL];
      await this.getMappings();
      await this.getMappingSuggestions(this.taskIri, this.taskName);
    }
  },
  data() {
    return {
      actions: [] as any[],
      taskIri: "",
      taskName: "",
      searching: false,
      searchTerm: "",
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      suggestions: [] as any[],
      selectedSuggestions: [] as any[],
      selectedMappings: [] as any[],
      mappings: [] as any[],
      loading: false,
      saveLoading: false,
      hoveredResult: {} as Models.Search.ConceptSummary,
      overlayLocation: {} as any,
      controller: {} as AbortController,
      hoveredItem: {} as any,
      selectedFilters: {
        scheme: Config.FilterDefaults.schemeOptions,
        type: [Vocabulary.IM.CONCEPT],
        status: [],
        usage: undefined
      }
    };
  },
  methods: {
    async saveMappings() {
      this.saveLoading = true;
      const mappingsMap = {} as any;
      const mappingIris = [] as string[];
      for (const mapping of this.mappings) {
        mappingIris.push(mapping.iri);
      }
      mappingsMap[this.taskIri] = mappingIris;
      try {
        await this.$entityService.saveMapping(mappingsMap);
        this.$toast.add(this.$loggerService.success("Mappings were saved"));
      } catch (error) {
        this.$toast.add(this.$loggerService.error("Mappings were not saved"));
      }
      this.saveLoading = false;
    },

    view(iri: string) {
      if (iri) DirectService.directTo(this.$env.VIEWER_URL, iri, this, "concept");
    },

    showInfo(iri: string) {
      if (iri) this.$emit("showDetails", iri);
    },

    hideOverlay(): void {
      const x = this.$refs.summary_overlay as any;
      x.hide();
    },

    async getMappings() {
      this.mappings = [];
      const mappings = (await this.$entityService.getPartialEntity(this.taskIri, [Vocabulary.IM.MATCHED_TO]))[Vocabulary.IM.MATCHED_TO] as any[];
      if (Helpers.DataTypeCheckers.isArrayHasLength(mappings))
        this.mappings = mappings.map(mapping => {
          return {
            iri: mapping["@id"],
            name: mapping.name
          };
        });
    },

    addToMappings(row: any) {
      const found = this.mappings.find(mapping => mapping.iri === row.data.iri);
      if (!found) {
        this.mappings.push(row.data);
      }
    },

    showOverlay(event: any, data: Models.Search.ConceptSummary): void {
      this.hoveredItem = data;
      const x = this.$refs.summary_overlay as any;
      x.show(event, event.target);
    },

    addSelected() {
      for (const selected of this.selectedSuggestions) {
        const found = this.mappings.find(mapping => mapping.iri === selected.iri);
        if (!found) {
          this.mappings.push(selected);
        }
      }
    },

    removeSelected() {
      for (const selected of this.selectedMappings) {
        const foundIndex = this.mappings.findIndex(mapping => mapping.iri === selected.iri);
        if (foundIndex !== -1) {
          this.mappings.splice(foundIndex, 1);
        }
      }
    },

    async getMappingSuggestions(iri: string, term: string) {
      this.loading = true;
      const searchRequest = await this.prepareSearchRequest(term);
      this.controller = new AbortController();
      let results = await this.$entityService.getMappingSuggestions(searchRequest, this.controller);
      const i = results.findIndex(entity => entity.iri === iri);
      if (i !== -1) {
        results.splice(i, 1);
      }
      this.suggestions = results.length ? results : [];
      this.loading = false;
    },

    async prepareSearchRequest(term: string) {
      this.searchResults = [];
      const searchRequest = {} as Models.Search.SearchRequest;
      searchRequest.termFilter = term;
      searchRequest.sortBy = SortBy.Usage;
      searchRequest.page = 1;
      searchRequest.size = 100;
      this.setFilters(searchRequest);
      if (isObjectHasKeys(this.request, ["cancel", "msg"])) {
        await this.request.cancel({ status: 499, message: "Search cancelled by user" });
      }
      const axiosSource = axios.CancelToken.source();
      this.request = { cancel: axiosSource.cancel, msg: "Loading..." };
      return searchRequest;
    },

    async search(): Promise<void> {
      this.searching = true;
      if (this.searchTerm.length > 0) {
        this.searchResults = [];
        const searchRequest = {} as Models.Search.SearchRequest;
        searchRequest.termFilter = this.searchTerm;
        searchRequest.sortBy = SortBy.Usage;
        searchRequest.page = 1;
        searchRequest.size = 100;
        this.setFilters(searchRequest);
        if (!Helpers.DataTypeCheckers.isObject(this.controller)) {
          this.controller.abort();
        }
        this.controller = new AbortController();
        await this.fetchSearchResults(searchRequest, this.controller);
      } else {
        await this.getMappingSuggestions(this.taskIri, this.taskName);
      }
      this.searching = false;
    },

    setFilters(searchRequest: Models.Search.SearchRequest) {
      searchRequest.schemeFilter = this.selectedFilters.scheme;
      searchRequest.statusFilter = this.selectedFilters.status;
      searchRequest.typeFilter = this.selectedFilters.type;
    },

    async fetchSearchResults(searchRequest: Models.Search.SearchRequest, controller: AbortController) {
      const result = await this.$entityService.advancedSearch(searchRequest, controller);
      if (result && isArrayHasLength(result)) {
        this.searchResults = result.map(item => {
          return { iri: item.iri, name: item.name, type: item.entityType, scheme: item.scheme, status: item.status, usage: item.weighting };
        });
      } else {
        this.searchResults = [];
      }
      this.suggestions = this.searchResults;
    },

    getConceptTypes(types: TTIriRef[]): string {
      return getNamesAsStringFromTypes(types);
    }
  }
});
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
