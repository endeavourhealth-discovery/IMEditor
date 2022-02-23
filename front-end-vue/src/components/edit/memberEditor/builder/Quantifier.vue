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
      />
    </div>
  </div>
  <OverlayPanel class="search-op" ref="miniSearchOP">
    <SearchMiniOverlay :searchTerm="searchTerm" :searchResults="searchResults" :loading="loading" @searchResultSelected="updateSelectedResult" />
  </OverlayPanel>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
import { mapState } from "vuex";
import axios from "axios";
import EntityService from "@/services/EntityService";
import { Vocabulary, Helpers, Enums, Models } from "im-library";
import { NextComponentSummary, EntityReferenceNode, Namespace, TTIriRef, ComponentDetails } from "im-library/src/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { IM } = Vocabulary;
const { BuilderType, ComponentType, SortBy } = Enums;
const {
  Search: { ConceptSummary, SearchRequest }
} = Models;

export default defineComponent({
  name: "Quantifier",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; quantifier: TTIriRef }>, required: false },
    last: { type: Boolean, required: true },
    builderType: { type: String as PropType<typeof BuilderType>, required: true }
  },
  emits: {
    updateClicked: (payload: ComponentDetails) => true,
    addNextOptionsClicked: (payload: NextComponentSummary) => true,
    deleteClicked: (payload: ComponentDetails) => true,
    addClicked: (payload: any) => true
  },
  components: { SearchMiniOverlay },
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
      searchResults: [] as typeof ConceptSummary[]
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

    async fetchSearchResults(searchRequest: typeof SearchRequest, cancelToken: any) {
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

    isTTIriRef(data: any): data is TTIriRef {
      if (data && (data as TTIriRef)["@id"]) return true;
      return false;
    },

    isConceptSummary(data: any): data is typeof ConceptSummary {
      if ((data as typeof ConceptSummary).iri) return true;
      return false;
    },

    updateSelectedResult(quantifier: typeof ConceptSummary | TTIriRef) {
      if (!quantifier) return;
      if (this.isConceptSummary(quantifier)) this.selectedResult = { "@id": quantifier.iri, name: quantifier.name };
      else this.selectedResult = quantifier;
      this.searchTerm = quantifier.name;
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
        builderType: this.builderType
      };
    }
  }
});
</script>

<style scoped>
.quantifier-item-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.label-container {
  margin: 0 1rem 0 0;
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
  width: 15rem;
}
</style>
