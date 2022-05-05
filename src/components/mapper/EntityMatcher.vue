<template>
  <div class="grid grid-nogutter">
    <div class="col-2">
      <Listbox
        class="task-action-container"
        v-model="selected"
        :options="data.selectedTasks"
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
          <VueJsonPretty class="mapping-item-container" :data="selectedView" />
        </TabPanel>
        <TabPanel header="Suggestions" v-if="isObjectHasKeys(selected)">
          <ExpansionTable
            class="mapping-item-container"
            :contents="selected.suggestions"
            :selectable="true"
            :inputSearch="false"
            :paginable="true"
            :expandable="true"
            @select="select"
            @unselect="unselect"
            @selectAll="selectAll"
            @unselectAll="unselectAll"
          />
        </TabPanel>
        <TabPanel header="Search">
          <ExpansionTable
            class="mapping-item-container"
            :contents="searchResults"
            :selectable="true"
            :inputSearch="true"
            @search="search"
            :paginable="true"
            @select="select"
            @unselect="unselect"
            @selectAll="selectAll"
            @unselectAll="unselectAll"
          />
        </TabPanel>
        <TabPanel header="Mapped to" v-if="isObjectHasKeys(selected)">
          <ExpansionTable
            class="mapping-item-container"
            :contents="mappingsMap.get(selected.iri)"
            :selectable="false"
            :inputSearch="false"
            :paginable="true"
            :removableRows="true"
            @remove="removeMapping"
          />
        </TabPanel>
        <TabPanel header="Hierarchy position" class="tab-container" v-if="isObjectHasKeys(selected)">
          <SecondaryTree :conceptIri="selected.iri" />
        </TabPanel>
      </TabView>
    </div>
  </div>
  <div class="button-bar flex flex-row justify-content-end" id="mapping-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button
      icon="pi pi-arrows-h"
      label="Map"
      class="p-button-help"
      :disabled="!(selected && (selectedSuggestions.length || selectedEntities.length))"
      @click="map"
    />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" :disabled="!this.mappingsMap.size" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import ExpansionTable from "./ExpansionTable.vue";
import { Vocabulary, Helpers, Models, Enums, LoggerService } from "im-library";
import { Namespace, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";
import EntityService from "@/services/EntityService";
import VueJsonPretty from "vue-json-pretty";
import axios from "axios";

const { IM, RDF, RDFS } = Vocabulary;
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
    ...mapState(["currentUser", "isLoggedIn", "filterOptions", "selectedFilters"])
  },
  emits: ["nextPage", "prevPage"],
  props: ["data"],
  watch: {
    async selected() {
      if (this.selected) {
        const fullEntity = await EntityService.getPartialEntity(this.selected.iri, []);
        this.selectedView = Object.assign(fullEntity);
        this.selected.suggestions = await this.getMappingSuggestions(this.selected.iri, this.selected.name);
        this.selectedSuggestions = [];
        this.selectedEntities = [];
      }
    }
  },

  data() {
    return {
      pageIndex: 2,
      tasks: [] as any,
      selectedView: {} as any,
      selectedSuggestions: [] as any[],
      selected: {} as any,
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      selectedEntities: [] as any[],
      mappingsMap: new Map<string, any>()
    };
  },

  methods: {
    isObjectHasKeys(object: any) {
      return isObjectHasKeys(object);
    },
    async getMappingSuggestions(iri: string, term: string) {
      const { searchRequest, token } = await this.prepareSearchRequestWithToken(term);
      let results = await EntityService.getMappingSuggestions(searchRequest, token);
      const i = results.findIndex(entity => entity.iri === iri);
      if (i !== -1) {
        results.splice(i, 1);
      }
      return results.map(entity => {
        return { iri: entity.iri, name: entity.name, type: entity.entityType };
      });
    },
    removeMapping(data: any) {
      const mappings = this.mappingsMap.get(this.selected.iri).filter((mapping: any) => mapping.iri !== data.iri);
      this.mappingsMap.set(this.selected.iri, mappings);
    },
    select(data: any) {
      this.selectedEntities.push(data);
    },
    unselect(data: any) {
      const i = this.selectedEntities.indexOf((task: any) => task.iri === data.iri);
      this.selectedEntities.splice(i, 1);
    },
    selectAll(selectedList: any[]) {
      this.selectedEntities = selectedList;
    },

    unselectAll() {
      this.selectedEntities = [];
    },
    getColourFromType(type: any) {
      return getColourFromType(type);
    },
    getFAIconFromType(type: any) {
      return getFAIconFromType(type);
    },
    next() {
      const data = this.data;
      data.mappingsMap = this.mappingsMap;
      this.$emit("nextPage", { pageIndex: this.pageIndex, data });
    },
    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, root: {} });
    },

    map() {
      if (isArrayHasLength(this.selectedEntities)) {
        this.addMapping(this.selectedEntities);
      } else if (isArrayHasLength(this.selectedSuggestions)) {
        this.addMapping(this.selectedSuggestions);
      }
      this.$toast.add(LoggerService.success("Mapping added to list"));
    },

    addMapping(entities: any[]) {
      if (!isArrayHasLength(this.selected.mappings)) {
        this.selected.mappings = [] as any[];
      }
      entities.forEach(entity => {
        const i = this.selected.mappings.findIndex((mapping: any) => entity.iri === mapping.iri);
        if (i === -1) {
          this.selected.mappings.push(entity);
        }
      });

      this.mappingsMap.set(this.selected.iri, this.selected.mappings);
    },

    async search(searchTerm: string): Promise<void> {
      if (searchTerm.length > 0) {
        const { searchRequest, token } = await this.prepareSearchRequestWithToken(searchTerm);
        await this.fetchSearchResults(searchRequest, token);
      }
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

.task-action-container {
  height: calc(100vh - 16.3rem);
}

.mapping-item-container {
  height: calc(100vh - 21.5rem);
  overflow: auto;
}

#mapping-button-bar {
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid #dee2e6;
  border-left: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
}
</style>
