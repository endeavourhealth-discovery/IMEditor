<template>
  <div class="grid grid-nogutter">
    <div class="col-2">
      <Listbox
        v-model="selected"
        :options="data"
        optionGroupLabel="name"
        optionGroupChildren="children"
        optionLabel="name"
        listStyle="height:95%;"
        :filter="true"
        filterPlaceholder="Search"
      >
        <template #option="slotProps">
          <span :style="'color: ' + getColourFromType(slotProps.option.type)" class="p-mx-1 type-icon">
            <font-awesome-icon :icon="getFAIconFromType(slotProps.option.type)" />
          </span>
          <span>{{ slotProps.option.name }}</span>
        </template>
      </Listbox>
    </div>
    <div class="col">
      <TabView :lazy="true" class="tabView">
        <TabPanel header="Details">
          <VueJsonPretty class="json" :data="selectedView" />
        </TabPanel>
        <TabPanel header="Suggestions">
          <ExpansionTable :contents="selected.suggestions" :selectable="true" :inputSearch="false" :paginable="true" />
        </TabPanel>
        <TabPanel header="Search">
          <ExpansionTable
            :contents="searchResults"
            :selectable="true"
            :inputSearch="true"
            @search="search"
            :paginable="true"
            @select="select"
            unselect="unselect"
          />
        </TabPanel>
      </TabView>
    </div>
  </div>
  <!-- <div class="button-bar flex flex-row justify-content-end" id="editor-button-bar">
    <Button icon="pi pi-times" label="Cancel" class="p-button-warning" @click="$router.go(-1)" />
    <Button
      icon="pi pi-arrows-h"
      label="Map"
      class="p-button-secondary"
      :disabled="!isObjectHasKeys(selected) || !isArrayHasLength(selectedSuggestions)"
      @click="map"
    />
    <Button icon="pi pi-prime" label="Auto-Map" class="p-button-help" @click="autoMap" />
    <Button icon="pi pi-check" label="Next" class="p-button-primary" @click="visibleFull = true" />
  </div> -->

  <div class="button-bar flex flex-row justify-content-end" id="task-definition-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import ExpansionTable from "./ExpansionTable.vue";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import { Namespace, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";
import EntityService from "@/services/EntityService";
import VueJsonPretty from "vue-json-pretty";
import axios from "axios";

const {
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight }
} = Helpers;
const {
  Search: { SearchRequest }
} = Models;
const { SortBy } = Enums;

export default defineComponent({
  name: "EntityMatcher",
  components: { ExpansionTable, VueJsonPretty },
  computed: {
    ...mapState(["editorIri", "editorSavedEntity", "currentUser", "isLoggedIn", "filterOptions", "selectedFilters"])
  },
  emits: ["nextPage", "prevPage"],
  props: ["data"],
  watch: {
    async selected() {
      if (this.selected) {
        this.selectedView = await EntityService.getPartialEntity(this.selected.iri, []);
        this.selected.suggestions = await EntityService.getMappingSuggestions(this.selected.iri, this.selected.name);
        this.selectedSuggestions = [];
      }
    }
  },
  data() {
    return {
      pageIndex: 2,
      selectedView: {} as any,
      selectedSuggestions: [] as any[],
      selected: {} as any,
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      selectedEntities: [] as any[]
    };
  },

  methods: {
    select(data: any) {
      this.selectedEntities.push(data);
    },
    unselect(data: any) {
      const i = this.selectedEntities.indexOf((task: any) => task.iri === data.iri);
      this.selectedEntities.splice(i, 1);
    },
    getColourFromType(type: any) {
      return getColourFromType(type);
    },
    getFAIconFromType(type: any) {
      return getFAIconFromType(type);
    },
    next() {
      this.$emit("nextPage", { pageIndex: this.pageIndex, root: {} });
    },
    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, root: {} });
    },
    async search(searchTerm: string): Promise<void> {
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

<style scoped>
.type-icon {
  padding-right: 0.5rem;
}
</style>
