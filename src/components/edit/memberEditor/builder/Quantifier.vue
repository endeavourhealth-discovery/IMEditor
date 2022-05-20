<template>
  <div class="quantifier-item-container" :id="id">
    <div class="label-container">
      <span class="float-text">Quantifier</span>
      <InputText
        ref="miniSearchInput"
        type="text"
        v-model="searchTerm"
        @input="search"
        @keyup.enter="search"
        @focus="showOverlay"
        @blur="hideOverlay"
        @change="showOverlay"
        placeholder="Search"
        class="p-inputtext search-input"
        autoWidth="true"
        v-tooltip="{ value: selectedResult.name, class: 'quantifier-tooltip' }"
      />
    </div>
    <AddDeleteButtons :show="showButtons" :position="position" :options="[]" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
  <OverlayPanel class="search-op" ref="miniSearchOP">
    <SearchMiniOverlay :searchTerm="searchTerm" :searchResults="searchResults" :loading="loading" @searchResultSelected="updateSelectedResult" />
  </OverlayPanel>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { mapState } from "vuex";
import axios from "axios";
import EntityService from "@/services/EntityService";
import { Vocabulary, Helpers, Enums, Models } from "im-library";
import { EntityReferenceNode, Namespace, TTIriRef, ComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { IM } = Vocabulary;
const { ComponentType, SortBy } = Enums;
const {
  Search: { SearchRequest }
} = Models;
export default defineComponent({
  name: "Quantifier",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; quantifier: TTIriRef }>, required: false },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (_payload: ComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: ComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  components: { AddDeleteButtons, SearchMiniOverlay },
  computed: mapState(["filterOptions", "selectedFilters"]),
  async mounted() {
    if (this.value && this.hasData(this.value)) {
      this.updateSelectedResult(this.value.quantifier);
      await this.search();
    } else {
      this.selectedResult = {} as TTIriRef;
      this.searchTerm = "";
    }
  },
  data() {
    return {
      loading: false,
      debounce: 0,
      request: {} as { cancel: any; msg: string },
      selectedResult: {} as TTIriRef,
      searchTerm: "",
      searchResults: [] as Models.Search.ConceptSummary[]
    };
  },
  methods: {
    hasData(data: any): data is { propertyIri: string; quantifier: TTIriRef } {
      if ((data as { propertyIri: string; quantifier: TTIriRef }).propertyIri) return true;
      return false;
    },
    // debounceForSearch(): void {
    //   clearTimeout(this.debounce);
    //   this.debounce = window.setTimeout(() => {
    //     this.search();
    //   }, 600);
    // },
    checkKey(event: any) {
      if (event.code === "Enter") {
        this.search();
      }
    },
    async search(): Promise<void> {
      if (this.searchTerm.length > 0) {
        this.searchResults = [];
        this.loading = true;
        const searchRequest = new SearchRequest();
        searchRequest.termFilter = this.searchTerm;
        searchRequest.sortBy = SortBy.Usage;
        searchRequest.page = 1;
        searchRequest.size = 100;
        searchRequest.schemeFilter = this.filterOptions.schemes.map((scheme: Namespace) => scheme.iri);
        searchRequest.statusFilter = [];
        this.filterOptions.status.forEach((status: EntityReferenceNode) => {
          searchRequest.statusFilter.push(status["@id"]);
        });
        searchRequest.typeFilter = [];
        searchRequest.typeFilter.push(IM.CONCEPT);
        if (isObjectHasKeys(this.request, ["cancel", "msg"])) {
          await this.request.cancel({ status: 499, message: "Search cancelled by user" });
        }
        const axiosSource = axios.CancelToken.source();
        this.request = { cancel: axiosSource.cancel, msg: "Loading..." };
        await this.fetchSearchResults(searchRequest, axiosSource.token);
        this.loading = false;
      }
    },
    async fetchSearchResults(searchRequest: Models.Search.SearchRequest, cancelToken: any) {
      const result = await EntityService.advancedSearch(searchRequest, cancelToken);
      if (result && isArrayHasLength(result)) {
        this.searchResults = result;
      } else {
        this.searchResults = [];
      }
    },
    hideOverlay(): void {
      const x = this.$refs.miniSearchOP as any;
      x.hide();
    },
    showOverlay(event: any): void {
      const x = this.$refs.miniSearchOP as any;
      x.show(event, event.target);
    },
    isConceptSummary(data: any): data is Models.Search.ConceptSummary {
      if ((data as Models.Search.ConceptSummary).iri) return true;
      return false;
    },
    updateSelectedResult(quantifier: Models.Search.ConceptSummary | TTIriRef) {
      if (!quantifier) return;
      if (this.isConceptSummary(quantifier)) this.selectedResult = { "@id": quantifier.iri, name: quantifier.name };
      else this.selectedResult = quantifier;
      this.searchTerm = quantifier.name ? quantifier.name : "";
      this.$emit("updateClicked", this.createQuantifier());
      this.hideOverlay();
    },
    editClicked(event: any) {
      this.showOverlay(event);
    },
    createQuantifier(): ComponentDetails {
      return {
        value: this.selectedResult,
        id: this.id,
        position: this.position,
        type: ComponentType.QUANTIFIER,
        json: this.selectedResult,
        builderType: this.builderType,
        showButtons: this.showButtons
      };
    },
    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.selectedResult,
        position: this.position,
        type: ComponentType.QUANTIFIER,
        builderType: this.builderType,
        json: this.selectedResult,
        showButtons: this.showButtons
      });
    },
    addNextClicked(): void {
      this.$emit("addNextOptionsClicked", {
        selectedType: ComponentType.QUANTIFIER,
        position: this.position + 1
      });
    }
  }
});
</script>

<style scoped>
.quantifier-item-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  width: 100%;
}
.label-container {
  flex: 1 1 auto;
  padding: 1rem;
  border: 1px solid #ffc952;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
}
.label {
  cursor: pointer;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  padding: 0.25rem;
}
.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}
.search-input {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<!-- <template>
  <div class="quantifier-item-container" :id="id">
    <div class="label-container">
      <span class="float-text">Quantifier</span>
      <div v-if="loading" class="loading-container">
        <ProgressSpinner style="width:1.5rem;height:1.5rem;" strokeWidth="6" />
      </div>
      <AutoComplete
        v-else-if="filteredOptions.length < 25"
        v-model="selectedResult"
        :suggestions="filteredOptions"
        @complete="selectFromDropdown"
        field="name"
        :dropdown="true"
        :disabled="invalidAssociatedProperty"
        :forceSelection="true"
      />
      <AutoComplete
        v-else
        v-model="selectedResult"
        :suggestions="filteredOptions"
        @complete="selectFromDropdown"
        :virtualScrollerOptions="{ itemSize: 25 }"
        field="name"
        :dropdown="true"
        :disabled="invalidAssociatedProperty"
        :forceSelection="true"
      />
      <small v-if="invalidAssociatedProperty" class="validate-error">Missing property for refinement. Please select a property first.</small>
    </div>
    <AddDeleteButtons :show="showButtons" :position="position" :options="[]" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import axios from "axios";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums, Models } from "im-library";
import { TTIriRef, ComponentDetails, Namespace, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";
import QueryService from "@/services/QueryService";
import EntityService from "@/services/EntityService";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  TypeGuards: { isTTIriRef },
  Sorters: { byName }
} = Helpers;
const { IM, RDFS } = Vocabulary;
const { ComponentType, SortBy } = Enums;
const {
  Search: { SearchRequest }
} = Models;

export default defineComponent({
  name: "Quantifier",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; quantifier: TTIriRef }>, required: true },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (_payload: ComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: ComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  components: { AddDeleteButtons, SearchMiniOverlay },
  computed: mapState(["filterOptions", "selectedFilters"]),
  watch: {
    value: {
      async handler() {
        await this.init();
      },
      deep: true
    },
    selectedResult: {
      handler(newValue, oldValue) {
        if (newValue && JSON.stringify(newValue) !== JSON.stringify(oldValue) && newValue["@id"]) this.onConfirm();
      },
      deep: true
    }
  },
  async mounted() {
    await this.init();
  },
  data() {
    return {
      loading: false,
      selectedResult: null as TTIriRef | null,
      dropdownOptions: [] as any[],
      filteredOptions: [] as any[],
      invalidAssociatedProperty: false,
      request: {} as { cancel: any; msg: string },
      propertyQuantiferKeys: [] as TTIriRef[]
    };
  },
  methods: {
    async init() {
      this.loading = true;
      if (this.value.propertyIri) {
        this.invalidAssociatedProperty = false;
        const query = this.createQuantifierOptionsQuery(this.value.propertyIri);
        const queryResult = await QueryService.queryIM(query);
        if (isObjectHasKeys(queryResult, ["entities", "@context"]) && isArrayHasLength(queryResult.entities)) {
          this.propertyQuantiferKeys = queryResult.entities
            .map(result => {
              return { "@id": result["@id"][0], name: result[RDFS.LABEL][0] };
            })
            .sort(byName);
        }
        await this.search({ query: this.value.propertyIri });
        if (this.value && isTTIriRef(this.value.quantifier)) {
          const found = this.dropdownOptions?.find(item => item["@id"] === this.value.quantifier["@id"]);
          if (found) this.selectedResult = found;
        }
      } else {
        this.invalidAssociatedProperty = true;
      }
      this.loading = false;
    },

    createQuantifierOptionsQuery(iri: string) {
      return {
        name: "Ranges for finding site",
        description: "retrieves the high level concepts allowable as values of the attribute finding side",
        activeOnly: true,
        select: {
          distinct: true,
          filter: {
            property: {
              "@id": "http://www.w3.org/2000/01/rdf-schema#range"
            },
            inverseOf: true,
            valueConcept: [
              {
                includeSupertypes: true,
                "@id": iri
              }
            ]
          },
          property: [
            {
              "@id": "http://endhealth.info/im#id"
            },
            {
              "@id": "http://www.w3.org/2000/01/rdf-schema#label"
            }
          ]
        }
      };
    },

    async search(event: any) {
      if (event.query.length > 0) {
        this.loading = true;
        this.dropdownOptions = [];
        const searchRequest = new SearchRequest();
        searchRequest.termFilter = event.query;
        searchRequest.sortBy = SortBy.Usage;
        searchRequest.page = 1;
        searchRequest.size = 100;
        this.setFilters(searchRequest);
        if (isObjectHasKeys(this.request, ["cancel", "msg"])) {
          await this.request.cancel({ status: 499, message: "Search cancelled by user" });
        }
        const axiosSource = axios.CancelToken.source();
        this.request = { cancel: axiosSource.cancel, msg: "Loading..." };
        const result = await EntityService.advancedSearch(searchRequest, axiosSource.token);
        if (isArrayHasLength(result)) {
          this.dropdownOptions = result.map(item => {
            return { "@id": item.iri, name: item.name };
          });
        }
        this.loading = false;
      }
    },

    setFilters(searchRequest: Models.Search.SearchRequest) {
      const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT || type["@id"] === IM.CONCEPT_SET);
      const filteredFilterOptions = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };

      searchRequest.schemeFilter = filteredFilterOptions.schemes.map((scheme: Namespace) => scheme.iri);

      searchRequest.statusFilter = [];
      for (const status of filteredFilterOptions.status) {
        searchRequest.statusFilter.push(status["@id"]);
      }

      searchRequest.typeFilter = [];
      for (const type of filteredFilterOptions.types) {
        searchRequest.typeFilter.push(type["@id"]);
      }
    },

    selectFromDropdown(event: any) {
      const query = event.query;
      let filteredItems = [];
      if (this.dropdownOptions) {
        for (let i = 0; i < this.dropdownOptions.length; i++) {
          let item = this.dropdownOptions[i];
          if (item.name.toLowerCase().indexOf(query.toLowerCase()) === 0) {
            filteredItems.push(item);
          }
        }
      }
      if (filteredItems.length) this.filteredOptions = filteredItems;
      else this.filteredOptions = this.dropdownOptions;
    },

    createQuantifier(): ComponentDetails {
      return {
        value: this.createAsJson(),
        id: this.id,
        position: this.position,
        type: ComponentType.QUANTIFIER,
        json: this.selectedResult,
        builderType: this.builderType,
        showButtons: this.showButtons
      };
    },

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.createAsJson(),
        position: this.position,
        type: ComponentType.QUANTIFIER,
        builderType: this.builderType,
        json: this.selectedResult,
        showButtons: this.showButtons
      });
    },

    createAsJson() {
      return { quantifier: this.selectedResult, propertyIri: this.value.propertyIri };
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.createAsJson(),
        position: this.position,
        type: ComponentType.QUANTIFIER,
        builderType: this.builderType,
        json: this.selectedResult,
        showButtons: this.showButtons
      });
    },

    addNextClicked(): void {
      this.$emit("addNextOptionsClicked", {
        selectedType: ComponentType.QUANTIFIER,
        position: this.position + 1
      });
    }
  }
});
</script>

<style scoped>
.quantifier-item-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.loading-container {
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.label-container {
  flex: 1 1 auto;
  padding: 1rem;
  border: 1px solid #ffc952;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
}

.label {
  cursor: pointer;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  padding: 0.25rem;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}

.p-autocomplete {
  width: 100%;
}

.p-autocomplete:deep(.p-autocomplete-input) {
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
  padding: 0 0 0.25rem 0;
}
</style> -->
