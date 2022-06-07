<template>
  <div class="card">
    <h5>Entity Mapper</h5>
    <DataTable :value="actions" editMode="cell" @cell-edit-complete="onCellEditComplete" class="editable-cells-table" responsiveLayout="scroll">
      <Column field="name" header="Name"></Column>
      <Column field="@id" header="Iri"></Column>
      <Column class="col-4" field="mappings" header="Map To">
        <template #body="{data}">
          <Chips v-model="data.mappings">
            <template #chip="slotProps">
              {{ slotProps.value.name }}
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
              <div>{{ slotProps.item.name }}</div>
            </template>
            <template #chip="slotProps">
              <div>{{ slotProps.value.name }}</div>
            </template>
          </AutoComplete>
        </template>
      </Column>
    </DataTable>
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
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType, isOfTypes },
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
      loading: false
    };
  },
  methods: {
    onCellEditComplete(event: any) {
      const action = this.actions.find(action => action["@id"] === event.data["@id"]);
      if (action) {
        action.mappings = event.newValue;
      }
      // console.log(event);
      // // console.log(this.actions);

      // this.mappingsMap.set(event.data["@id"], event.newValue);
      // console.log(this.mappingsMap);
    },

    getMappingsDisplay(iri: string) {
      this.mappingsMap.get(iri)?.map((mapping: any) => mapping["@id"]);
    },

    async getMappingSuggestions(iri: string, term: string) {
      console.log("here");
      this.loading = true;
      const { searchRequest, token } = await this.prepareSearchRequestWithToken(term);
      let results = await EntityService.getMappingSuggestions(searchRequest, token);
      const i = results.findIndex(entity => entity.iri === iri);
      if (i !== -1) {
        results.splice(i, 1);
      }
      console.log(results);
      this.loading = false;
      return results.map(entity => {
        return { iri: entity.iri, name: entity.name, type: entity.entityType, scheme: entity.scheme };
      });
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
      let options = {} as { status: EntityReferenceNode[]; schemes: Namespace[]; types: EntityReferenceNode[] };
      options = this.filterOptions;
      searchRequest.schemeFilter = options.schemes.map((scheme: Namespace) => scheme.iri);
      searchRequest.statusFilter = [];
      for (const status of options.status) {
        searchRequest.statusFilter.push(status["@id"]);
      }
      searchRequest.typeFilter = [];
      for (const type of options.types) {
        searchRequest.typeFilter.push(type["@id"]);
      }
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
    }
  }
});
</script>

<style scoped></style>
