<template>
  <div class="quantifier-item-container" :id="id">
    <div class="label-container">
      <span class="float-text">Quantifier</span>
      <div v-if="loading" class="loading-container">
        <ProgressSpinner style="width:1.5rem;height:1.5rem;" strokeWidth="6" />
      </div>
      <div v-else class="input-treebutton-container">
        <InputText
          ref="miniSearchInput"
          v-model="searchTerm"
          @input="search"
          @keyup.enter="search"
          @focus="showOverlay"
          @change="showOverlay"
          placeholder="Search"
          :dropdown="true"
          :disabled="invalidAssociatedProperty"
          class="search-input"
        />
        <Button icon="fa-solid fa-sitemap" @click="showTreeDialog($event)" />
      </div>
      <small v-if="invalidAssociatedProperty" class="validate-error">Missing property for refinement. Please select a property first.</small>
    </div>
    <AddDeleteButtons :show="showButtons" :position="position" :options="[]" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
  <OverlayPanel class="search-op" ref="miniSearchOP" :showCloseIcon="true" :dismissable="true">
    <SearchMiniOverlay :searchTerm="searchTerm" :searchResults="searchResults" :loading="loading" @searchResultSelected="updateSelectedResult" />
  </OverlayPanel>
  <OverlayPanel class="tree-op" ref="treeOP" :showCloseIcon="true" :dismissable="true">
    <QuantifierTree :isAs="isAs" :quantifier="selectedResult" @treeNodeSelected="updateSelectedResult" />
  </OverlayPanel>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import axios from "axios";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
import QuantifierTree from "@/components/edit/memberEditor/builder/quantifier/QuantifierTree.vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums, Models } from "im-library";
import { TTIriRef, ComponentDetails, Namespace, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";
import QueryService from "@/services/QueryService";
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
  components: { AddDeleteButtons, SearchMiniOverlay, QuantifierTree },
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
      selectedResult: {} as TTIriRef,
      dropdownOptions: [] as any[],
      filteredOptions: [] as any[],
      invalidAssociatedProperty: false,
      request: {} as { cancel: any; msg: string },
      isAs: [] as string[],
      searchTerm: "",
      searchResults: [] as Models.Search.ConceptSummary[]
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
          this.isAs = queryResult.entities.map(result => result["@id"]);
        }
        if (isArrayHasLength(this.isAs)) {
          if (this.value && isTTIriRef(this.value.quantifier)) {
            this.searchTerm = this.value.quantifier.name;
            await this.search();
            const found = this.searchResults.find(item => item.iri === this.value.quantifier["@id"]);
            if (found) this.selectedResult = { "@id": found.iri, name: found.name };
          }
        }
      } else {
        this.invalidAssociatedProperty = true;
      }
      this.loading = false;
    },

    hideOverlay(): void {
      const x = this.$refs.miniSearchOP as any;
      if (x) x.hide();
    },

    showOverlay(event: any): void {
      const x = this.$refs.miniSearchOP as any;
      if (x) x.show(event, event.target);
    },

    showTreeDialog(event: any): void {
      const x = this.$refs.treeOP as any;
      if (x) x.show(event, event.target);
    },

    hideTreeOverlay(): void {
      const x = this.$refs.treeOP as any;
      if (x) x.hide();
    },

    updateSelectedResult(data: Models.Search.ConceptSummary | TTIriRef) {
      if (!isObjectHasKeys(data)) {
        this.selectedResult = {} as TTIriRef;
        this.searchTerm = "";
      } else if (isTTIriRef(data)) {
        this.selectedResult = data;
        this.searchTerm = data.name;
      } else {
        this.selectedResult = { "@id": data.iri, name: data.name };
        this.searchTerm = data.name;
      }
      this.onConfirm();
      this.hideOverlay();
      this.hideTreeOverlay();
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

    async search() {
      if (this.searchTerm.length > 0) {
        this.loading = true;
        this.searchResults = [];
        const searchRequest = new SearchRequest();
        searchRequest.termFilter = this.searchTerm;
        searchRequest.isA = this.isAs;
        this.setFilters(searchRequest);
        if (isObjectHasKeys(this.request, ["cancel", "msg"])) {
          await this.request.cancel({ status: 499, message: "Search cancelled by user" });
        }
        const axiosSource = axios.CancelToken.source();
        this.request = { cancel: axiosSource.cancel, msg: "Loading..." };
        const result = await this.$entityService.advancedSearch(searchRequest, axiosSource.token);
        if (isArrayHasLength(result)) {
          this.searchResults = result;
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
        if (status["@id"] === IM.ACTIVE) searchRequest.statusFilter.push(status["@id"]);
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
      this.$emit("updateClicked", this.createQuantifier());
    },

    createAsJson() {
      return { quantifier: this.selectedResult, propertyIri: this.value.propertyIri };
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", this.createQuantifier());
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

.search-input {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-treebutton-container {
  display: flex;
  flex-flow: row nowrap;
  width: 100%;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
  padding: 0 0 0.25rem 0;
}
</style>
