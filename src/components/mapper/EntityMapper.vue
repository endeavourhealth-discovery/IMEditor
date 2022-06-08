<template>
  <div class="entity-mapper-container">
    <h5>Entity Mapper</h5>
    <DataTable :value="actions" editMode="cell" @cell-edit-complete="onCellEditComplete" class="editable-cells-table" responsiveLayout="scroll">
      <Column field="name" header="Name"></Column>
      <Column field="@id" header="Iri"></Column>
      <Column class="col-4" field="mappings" header="Map To">
        <template #body="{data}">
          <Chips v-model="data.mappings">
            <template #chip="slotProps">
              <div @click="showDetails(slotProps.value.iri)">{{ slotProps.value.name }}</div>
            </template>
          </Chips>
        </template>
        <template #editor="{ data, field }">
          <AutoComplete
            v-model="data[field]"
            :suggestions="suggestions"
            @complete="search($event)"
            :dropdown="true"
            :multiple="true"
            :loading="loading"
            @dropdown-click="getMappingSuggestions(data['@id'], data.name)"
          >
            <template #item="slotProps">
              <div @mouseover="showOverlay($event, slotProps.item.iri)" @mouseleave="hideOverlay($event)">{{ slotProps.item.name }}</div>
            </template>
            <template #chip="slotProps">
              <div @click="showDetails(slotProps.value.iri)">{{ slotProps.value.name }}</div>
            </template>
          </AutoComplete>
        </template>
      </Column>
    </DataTable>

    <OverlayPanel ref="navTreeOP" id="nav_tree_overlay_panel" style="width: 50vw" :breakpoints="{ '960px': '75vw' }">
      <div v-if="hoveredResult.name" class="flex flex-row justify-contents-start result-overlay" style="width: 100%; gap: 1rem;">
        <div class="left-side" style="width: 50%">
          <p>
            <strong>Name: </strong>
            <span>{{ hoveredResult.name }}</span>
          </p>
          <p>
            <strong>Iri: </strong>
            <span style="word-break:break-all;">{{ hoveredResult.iri }}</span>
          </p>
          <p v-if="hoveredResult.code">
            <strong>Code: </strong>
            <span>{{ hoveredResult.code }}</span>
          </p>
        </div>
        <div class="right-side" style="width: 50%">
          <p v-if="hoveredResult.status">
            <strong>Status: </strong>
            <span>{{ hoveredResult.status.name }}</span>
          </p>
          <p v-if="hoveredResult.scheme">
            <strong>Scheme: </strong>
            <span>{{ hoveredResult.scheme.name }}</span>
          </p>
          <p v-if="hoveredResult.entityType">
            <strong>Type: </strong>
            <span>{{ getConceptTypes(hoveredResult.entityType) }}</span>
          </p>
        </div>
      </div>
    </OverlayPanel>
  </div>
  <div class="button-bar">
    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
    <Button icon="pi pi-check" label="Save mappings" class="save-button" @click="saveMappings" />
  </div>
</template>

<script lang="ts">
import EntityService from "@/services/EntityService";
import { defineComponent } from "vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import axios from "axios";
import { Namespace, EntityReferenceNode, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";

const { IM, RDF, RDFS } = Vocabulary;
const {
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType, isOfTypes, getNamesAsStringFromTypes },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight }
} = Helpers;
const {
  Search: { SearchRequest }
} = Models;
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
    this.actions = await EntityService.getEntityChildren(this.taskIri);
    for (const action of this.actions) {
      this.suggestions = await EntityService.getMappingSuggestions(action["@id"], action.name);
    }
  },
  data() {
    return {
      actions: [] as any[],
      taskIri: "http://endhealth.info/im#MappingTask1",
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      suggestions: [] as any[],
      mappingsMap: new Map<string, any>(),
      loading: false,
      hoveredResult: {} as Models.Search.ConceptSummary,
      overlayLocation: {} as any
    };
  },
  methods: {
    saveMappings() {
      console.log("save");
    },
    showDetails(selectedIri: string) {
      this.$emit("showDetails", selectedIri);
    },

    onCellEditComplete(event: any) {
      const action = this.actions.find(action => action["@id"] === event.data["@id"]);
      if (action) {
        action.mappings = event.newValue;
      }
    },

    getMappingsDisplay(iri: string) {
      this.mappingsMap.get(iri)?.map((mapping: any) => mapping["@id"]);
    },

    async getMappingSuggestions(iri: string, term: string) {
      this.loading = true;
      const { searchRequest, token } = await this.prepareSearchRequestWithToken(term);
      let results = await EntityService.getMappingSuggestions(searchRequest, token);
      const i = results.findIndex(entity => entity.iri === iri);
      if (i !== -1) {
        results.splice(i, 1);
      }

      this.suggestions = results.length
        ? results
        : [
            {
              iri: "http://snomed.info/sct#999030171000230104",
              name:
                "United Kingdom National Health Service primary care data extraction - General practice data extraction - chest discomfort simple reference set (foundation metadata concept)",
              type: [{ name: "Concept Set", "@id": "http://endhealth.info/im#ConceptSet" }]
            }
          ];

      this.loading = false;
    },

    async prepareSearchRequestWithToken(term: string) {
      this.searchResults = [];
      const searchRequest = new SearchRequest();
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
      return { searchRequest: searchRequest, token: axiosSource.token };
    },

    async search(event: any): Promise<void> {
      const searchTerm = event.query;
      if (searchTerm.length > 0) {
        this.searchResults = [];
        const searchRequest = new SearchRequest();
        searchRequest.termFilter = searchTerm;
        searchRequest.sortBy = SortBy.Usage;
        searchRequest.page = 1;
        searchRequest.size = 100;
        this.setFilters(searchRequest);
        if (isObjectHasKeys(this.request, ["cancel", "msg"])) {
          await this.request.cancel({ status: 499, message: "Search cancelled by user" });
        }
        const axiosSource = axios.CancelToken.source();
        this.request = { cancel: axiosSource.cancel, msg: "Loading..." };
        await this.fetchSearchResults(searchRequest, axiosSource.token);
      }
      this.suggestions = this.searchResults;
    },

    setFilters(searchRequest: Models.Search.SearchRequest) {
      searchRequest.schemeFilter = [
        "http://endhealth.info/bc#",
        "http://endhealth.info/ceg/qry#",
        "http://endhealth.info/emis#",
        "http://endhealth.info/icd10#",
        "http://endhealth.info/im#",
        "http://endhealth.info/nhstfc#",
        "http://endhealth.info/ods#",
        "http://endhealth.info/opcs4#",
        "http://www.w3.org/2002/07/owl#",
        "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
        "http://www.w3.org/2000/01/rdf-schema#",
        "http://www.w3.org/ns/shacl#",
        "http://snomed.info/sct#",
        "http://endhealth.info/tpp#",
        "http://endhealth.info/vis#",
        "http://rdf4j.org/schema/rdf4j#",
        "http://www.geonames.org/ontology#",
        "http://www.ontotext.com/path#",
        "http://www.openrdf.org/schema/sesame#",
        "http://www.w3.org/2001/XMLSchema#",
        "http://www.w3.org/2003/01/geo/wgs84_pos#",
        "http://www.w3.org/2005/xpath-functions#"
      ];
      searchRequest.statusFilter = ["http://endhealth.info/im#Active", "http://endhealth.info/im#Draft"];
      searchRequest.typeFilter = [
        "http://endhealth.info/im#Concept",
        "http://endhealth.info/im#ValueSet",
        "http://endhealth.info/im#ConceptSet",
        "http://endhealth.info/im#DataModelEntity",
        "http://endhealth.info/im#dataModelProperty",
        "http://endhealth.info/im#Query"
      ];
    },

    async fetchSearchResults(searchRequest: Models.Search.SearchRequest, cancelToken: any) {
      const result = await EntityService.advancedSearch(searchRequest, cancelToken);
      if (result && isArrayHasLength(result)) {
        this.searchResults = result.map(item => {
          return { iri: item.iri, name: item.name, type: item.entityType };
        });
      } else {
        this.searchResults = [];
      }
    },

    async showOverlay(event: any, iri?: string): Promise<void> {
      if (iri) {
        const x = this.$refs.navTreeOP as any;
        this.overlayLocation = event;
        x.show(this.overlayLocation);
        this.hoveredResult = await EntityService.getEntitySummary(iri);
      }
    },

    hideOverlay(event: any): void {
      const x = this.$refs.navTreeOP as any;
      x.hide(event);
      this.overlayLocation = {} as any;
    },

    getConceptTypes(types: TTIriRef[]): string {
      return getNamesAsStringFromTypes(types);
    }
  }
});
</script>

<style scoped>
.entity-mapper-container {
  width: 100%;
  padding: 2rem 2rem 0 2rem;
  overflow: auto;
  position: relative;
  background-color: #ffffff;
  height: calc(100vh - 11.6rem);
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
