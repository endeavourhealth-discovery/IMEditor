<template>
  <div class="entity-search-item-container" :id="id">
    <div class="label-container">
      <span class="float-text">{{ label }}</span>
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
    <AddDeleteButtons v-if="label !== 'Property'" :last="last" :position="position" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
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
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { Namespace, TTIriRef, EntityReferenceNode, ComponentDetails, NextComponentSummary } from "im-library/dist/types/interfaces/Interfaces";
import { Helpers, Models, Enums } from "im-library";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { ComponentType, BuilderType, SortBy } = Enums;
const {
  Search: { ConceptSummary, SearchRequest }
} = Models;

export default defineComponent({
  name: "Entity",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: {
      type: Object as PropType<{
        filterOptions: { status: EntityReferenceNode[]; schemes: Namespace[]; types: EntityReferenceNode[] };
        entity: TTIriRef | undefined;
        type: Enums.ComponentType;
        label: string;
      }>,
      required: true
    },
    last: { type: Boolean, required: true },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (payload: ComponentDetails) => true,
    addNextOptionsClicked: (payload: NextComponentSummary) => true,
    deleteClicked: (payload: ComponentDetails) => true,
    addClicked: (payload: any) => true
  },
  components: { SearchMiniOverlay, AddDeleteButtons },
  computed: mapState(["filterOptions", "selectedFilters"]),
  watch: {
    value: {
      async handler() {
        if (!this.value.entity) await this.init();
      }
    }
  },
  async mounted() {
    await this.init();
  },
  data() {
    return {
      loading: false,
      debounce: 0,
      request: {} as { cancel: any; msg: string },
      selectedResult: {} as TTIriRef,
      searchTerm: "",
      searchResults: [] as Models.Search.ConceptSummary[],
      label: ""
    };
  },
  methods: {
    async init() {
      if (this.value && this.value.entity && isObjectHasKeys(this.value.entity, ["name", "@id"])) {
        this.updateSelectedResult(this.value.entity);
        await this.search();
      } else {
        this.selectedResult = {} as TTIriRef;
        this.searchTerm = "";
      }
      this.value?.label ? (this.label = this.value.label) : (this.label = "Entity");
    },
    // debounceForSearch(): void {
    //   clearTimeout(this.debounce);
    //   this.debounce = window.setTimeout(() => {
    //     this.search();
    //   }, 600);
    // },

    // checkKey(event: any) {
    //   if (event.code === "Enter") {
    //     this.search();
    //   }
    // },

    async search(): Promise<void> {
      if (this.searchTerm.length > 0) {
        this.searchResults = [];
        this.loading = true;
        const searchRequest = new SearchRequest();
        searchRequest.termFilter = this.searchTerm;
        searchRequest.sortBy = SortBy.Usage;
        searchRequest.page = 1;
        searchRequest.size = 100;
        this.setFilters(searchRequest);
        // searchRequest.schemeFilter = this.filterOptions.schemes.map((scheme: Namespace) => scheme.iri);

        // searchRequest.statusFilter = [];
        // this.filterOptions.status.forEach((status: EntityReferenceNode) => {
        //   searchRequest.statusFilter.push(status["@id"]);
        // });
        // searchRequest.typeFilter = [];
        // searchRequest.typeFilter.push(IM.CONCEPT);
        if (isObjectHasKeys(this.request, ["cancel", "msg"])) {
          await this.request.cancel({ status: 499, message: "Search cancelled by user" });
        }
        const axiosSource = axios.CancelToken.source();
        this.request = { cancel: axiosSource.cancel, msg: "Loading..." };
        await this.fetchSearchResults(searchRequest, axiosSource.token);
        this.loading = false;
      }
    },

    setFilters(searchRequest: Models.Search.SearchRequest) {
      let options = {} as { status: EntityReferenceNode[]; schemes: Namespace[]; types: EntityReferenceNode[] };
      if (this.value && isObjectHasKeys(this.value.filterOptions)) {
        options = this.value.filterOptions;
      } else {
        options = this.filterOptions;
      }
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
      if ((data as TTIriRef)["@id"]) return true;
      return false;
    },

    updateSelectedResult(data: Models.Search.ConceptSummary | TTIriRef) {
      if (!isObjectHasKeys(data)) return;
      if (this.isTTIriRef(data)) {
        this.selectedResult = data;
      } else {
        this.selectedResult = { "@id": data.iri, name: data.name };
      }
      this.searchTerm = data.name;
      this.$emit("updateClicked", this.createEntity());
      this.hideOverlay();
    },

    editClicked(event: any) {
      this.showOverlay(event);
    },

    createEntity(): ComponentDetails {
      if (this.value)
        return {
          value: { entity: this.selectedResult, filterOptions: this.value.filterOptions, type: this.value.type, label: this.value.label },
          id: this.id,
          position: this.position,
          type: this.value.type,
          json: this.selectedResult,
          builderType: this.builderType
        };
      else {
        return {
          value: { entity: this.selectedResult, filterOptions: this.filterOptions, type: ComponentType.ENTITY, label: "Entity" },
          id: this.id,
          position: this.position,
          type: ComponentType.ENTITY,
          json: {},
          builderType: this.builderType
        };
      }
    },

    deleteClicked(): void {
      if (this.value)
        this.$emit("deleteClicked", {
          id: this.id,
          value: this.selectedResult,
          position: this.position,
          type: this.value.type,
          builderType: this.builderType,
          json: this.selectedResult
        });
      else
        this.$emit("deleteClicked", {
          id: this.id,
          value: this.selectedResult,
          position: this.position,
          type: ComponentType.ENTITY,
          builderType: this.builderType,
          json: this.selectedResult
        });
    },

    addNextClicked(): void {
      if (this.value)
        this.$emit("addNextOptionsClicked", {
          previousComponentType: this.value.type,
          previousPosition: this.position,
          parentGroup: this.value.type
        });
      else
        this.$emit("addNextOptionsClicked", {
          previousComponentType: ComponentType.ENTITY,
          previousPosition: this.position,
          parentGroup: ComponentType.ENTITY
        });
    }
  }
});
</script>

<style scoped>
.entity-search-item-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
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
}
</style>
