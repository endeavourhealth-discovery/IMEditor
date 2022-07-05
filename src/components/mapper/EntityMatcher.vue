<template>
  <div class="entity-mapper-container">
    <Listbox
      v-model="selected"
      :options="data.selectedTasks"
      optionGroupLabel="name"
      optionGroupChildren="children"
      optionLabel="name"
      listStyle="height:95%;"
      :filter="true"
      filterPlaceholder="Search"
      class="col-2"
    >
      <template #option="slotProps">
        <span :style="'color: ' + getColourFromType(slotProps.option.type)" class="p-mx-1 type-icon">
          <i :class="getFAIconFromType(slotProps.option.type)" aria-hidden="true" />
        </span>
        <span>{{ slotProps.option.name }}</span>
      </template>
    </Listbox>

    <TabView :lazy="true" class="tabView col" @tab-change="selectedEntities = []">
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
          :expandable="true"
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

  <div class="button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-plus" label="Create new entity" class="p-button-warning" @click="directToCreator" />
    <Button icon="pi pi-arrows-h" label="Map" class="p-button-help" :disabled="!(selected && selectedEntities.length)" @click="map" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" :disabled="!mappingsMap.size" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import ExpansionTable from "./ExpansionTable.vue";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import { Namespace, EntityReferenceNode, SearchRequest, ConceptSummary } from "im-library/dist/types/interfaces/Interfaces";
import VueJsonPretty from "vue-json-pretty";

const {
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys, isObject }
} = Helpers;
const { SortBy } = Enums;

export default defineComponent({
  name: "EntityMatcher",
  components: { ExpansionTable, VueJsonPretty },
  computed: {
    ...mapState(["filterOptions", "selectedFilters"])
  },
  emits: {
    nextPage: (_payload: { pageIndex: number; data: {} }) => true,
    prevPage: (_payload: { pageIndex: number; data: {} }) => true
  },
  props: {
    data: { type: Object, required: true }
  },
  watch: {
    async selected(newValue, oldValue) {
      if (!newValue) {
        this.selected = oldValue;
      }
      if (this.selected) {
        const fullEntity = await this.$entityService.getPartialEntity(this.selected.iri, []);
        this.selectedView = { ...fullEntity };
        this.selected.suggestions = await this.getMappingSuggestions(this.selected.iri, this.selected.name);
        this.selectedEntities = [];
        if (isArrayHasLength(this.selected.mappings) && !this.mappingsMap.has(this.selected.iri)) {
          this.mappingsMap.set(this.selected.iri, this.selected.mappings);
        }
      }
    }
  },

  data() {
    return {
      pageIndex: 2,
      tasks: [] as any,
      selectedView: {} as any,
      selected: {} as any,
      searchResults: [] as any[],
      controller: {} as AbortController,
      selectedEntities: [] as any[],
      mappingsMap: new Map<string, any>()
    };
  },

  methods: {
    directToCreator() {
      this.$router.push({ name: "Creator" });
    },

    isObjectHasKeys(object: any) {
      return isObjectHasKeys(object);
    },

    async getMappingSuggestions(iri: string, term: string) {
      const { searchRequest, controller } = await this.prepareSearchRequestWithToken(term);
      let results = await this.$entityService.getMappingSuggestions(searchRequest, controller);
      const i = results.findIndex((entity: ConceptSummary) => entity.iri === iri);
      if (i !== -1) {
        results.splice(i, 1);
      }
      return results.map((entity: ConceptSummary) => {
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
      this.selectedEntities = this.selectedEntities.filter((task: any) => task.iri !== data.iri);
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
      this.$emit("nextPage", { pageIndex: this.pageIndex, data: data });
    },

    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, data: {} });
    },

    map() {
      if (isArrayHasLength(this.selectedEntities)) {
        this.addMapping(this.selectedEntities);
      }
      this.$toast.add(this.$loggerService.success("Mapping added to list"));
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
        const { searchRequest, controller } = await this.prepareSearchRequestWithToken(searchTerm);
        await this.fetchSearchResults(searchRequest, controller);
      }
    },

    async prepareSearchRequestWithToken(term: string) {
      this.searchResults = [];
      const searchRequest = {} as SearchRequest;
      searchRequest.termFilter = term;
      searchRequest.sortBy = SortBy.Usage;
      searchRequest.page = 1;
      searchRequest.size = 100;
      this.setFilters(searchRequest);
      if (!isObject(this.controller)) {
        this.controller.abort();
      }
      this.controller = new AbortController();
      return { searchRequest: searchRequest, controller: this.controller };
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

    async fetchSearchResults(searchRequest: SearchRequest, controller: AbortController) {
      const result = await this.$entityService.advancedSearch(searchRequest, controller);
      if (result && isArrayHasLength(result)) {
        this.searchResults = result.map((item: ConceptSummary) => {
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

.entity-mapper-container {
  height: calc(100% - 11.6rem);
  width: 100%;
  overflow: auto;
  background-color: #ffffff;
  display: flex;
  flex-flow: column nowrap;
  flex: auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
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

.p-listbox {
  border: none;
}
</style>
