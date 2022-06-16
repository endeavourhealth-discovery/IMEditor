<template>
  <ConfirmDialog></ConfirmDialog>
  <div class="definition-main-container">
    <h5 class="title">Task Definition</h5>
    <Card class="task-definition-container">
      <template #header>
        <div class="flex">
          <div class="flex flex-auto field p-float-label">
            <InputText disabled id="iri" type="text" class="p-inputtext-lg input-text" v-model="taskIri" />
            <label for="iri">Iri</label>
          </div>
          <div class="flex flex-auto field p-float-label">
            <InputText id="name" type="text" class="p-inputtext-lg input-text" v-model="name" />
            <label for="name">Name</label>
          </div>
          <div class="flex flex-auto field p-float-label">
            <Dropdown class="p-inputtext-lg input-text" id="type" v-model="type" :options="taskTypes" optionLabel="name" />
            <label for="type">Type</label>
          </div>
        </div>
        <small v-if="taskIriExists" id="iri" class="field p-error">Iri exists. Saving will update the entity.</small>
      </template>
      <template #content>
        <Accordion>
          <AccordionTab header="Search filters">
            <div class="flex justify-content-between">
              <MultiSelect v-model="selectedFilters.scheme" :options="filterOptions.schemes" optionLabel="name" optionValue="iri" placeholder="Select scheme" />
              <MultiSelect v-model="selectedFilters.type" :options="filterOptions.types" optionLabel="name" optionValue="iri" placeholder="Select type" />
              <MultiSelect v-model="selectedFilters.status" :options="filterOptions.status" optionLabel="name" optionValue="iri" placeholder="Select status" />
              <InputNumber v-model="selectedFilters.usage" placeholder="Usage threshold" :min="0" />
              <InputText v-model="searchTerm" placeholder="Keyword Search" />
              <Button :loading="loading" icon="pi pi-search" label="Search" class="save-button" @click="search()" />
            </div>
          </AccordionTab>
        </Accordion>
        <div class="flex">
          <DataTable class="flex-1 flex justify-content-center" dataKey="iri" :value="unmapped" responsiveLayout="scroll" :loading="loading">
            <template #empty>
              No results found.
            </template>
            <template #loading>
              Loading results.
            </template>
            <Column field="name" header="Name"> </Column>
            <Column field="scheme" header="Scheme">
              <template #body="{data}">
                {{ getNameDisplay(data.scheme) }}
              </template>
            </Column>
            <Column field="code" header="Code"></Column>
          </DataTable>
          <DataTable class="flex-1 flex justify-content-center" dataKey="iri" :value="contents" responsiveLayout="scroll" :loading="loading">
            <template #empty>
              No actions added.
            </template>
            <template #loading>
              Loading contents.
            </template>
            <Column field="iri" header="Iri"></Column>
            <Column field="name" header="Name"></Column>
          </DataTable>
        </div>
      </template>
    </Card>
    <div class="button-bar">
      <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
      <Button :loading="saveLoading" icon="pi pi-check" label="Save" class="save-button" @click="save" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ConfirmDialog from "primevue/confirmdialog";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";
import MultipleTaskSelection from "@/components/mapper/MultipleTaskSelection.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Models, Enums, Env } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import axios from "axios";
import { Namespace, EntityReferenceNode, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import DirectService from "@/services/DirectService";
import Filters from "@/components/Filters.vue";

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
import { FilterMatchMode, FilterOperator } from "primevue/api";

export default defineComponent({
  name: "Mapper",
  components: {
    ConfirmDialog,
    VueJsonPretty,
    ExpansionTable,
    MultipleTaskSelection,
    Filters
  },

  props: {
    data: { type: Object, required: true }
  },

  emits: {
    nextPage: (_payload: { pageIndex: number; data: {} }) => true,
    prevPage: (_payload: { pageIndex: number; data: {} }) => true,
    showDetails: (_payload: string) => true,
    updateSelected: (_payload: string) => true
  },

  computed: {
    ...mapState(["filterOptions"])
  },

  watch: {
    async taskIri() {
      if (this.taskIri) await this.setIriExists();
    },
    name() {
      this.generateTaskIri();
    },
    type() {
      this.generateTaskIri();
    },
    selected() {
      this.$emit("updateSelected", this.selected.iri);
    }
  },

  data() {
    return {
      taskIri: "",
      selected: {} as any,
      type: {} as any,
      name: "",
      taskTypes: [] as any[],
      taskIriExists: false,
      unmapped: [] as any[],
      contents: [] as any[],
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      searchTerm: "",
      loading: true,
      saveLoading: false,
      selectedFilters: {
        scheme: [] as any,
        type: [] as any,
        status: [] as any,
        usage: undefined
      }
    };
  },

  async mounted() {
    this.taskIri = this.$route.params.taskIri as string;
    this.loading = true;
    await this.init();
    this.loading = false;
  },

  methods: {
    async setIriExists() {
      this.taskIriExists = await EntityService.iriExists(this.taskIri);
    },

    generateTaskIri() {
      if (isObjectHasKeys(this.type) && this.name) {
        const type = this.type.name.split(" ")[0].toLowerCase();
        const name = this.name.charAt(0).toLowerCase() + this.name.slice(1).replaceAll(" ", "");
        this.taskIri = "http://task.endhealth.info/" + type + "#" + name;
      }
    },

    async getTaskTypes() {
      this.taskTypes = (await EntityService.getEntityChildren(IM.NAMESPACE + "Task")).map(child => {
        return { "@id": child["@id"], name: child.name };
      });
    },

    async getUnmapped(limit?: number) {
      this.loading = true;
      this.unmapped = (
        await EntityService.getUnmapped(
          undefined,
          this.selectedFilters.status,
          this.selectedFilters.scheme,
          this.selectedFilters.type,
          this.selectedFilters.usage,
          limit || 100
        )
      ).map(unmapped => {
        return {
          iri: unmapped["@id"],
          name: unmapped[RDFS.LABEL],
          type: unmapped[RDF.TYPE],
          usage: unmapped[IM.NAMESPACE + "usageTotal"],
          scheme: unmapped[IM.SCHEME],
          status: unmapped[IM.HAS_STATUS],
          code: unmapped[IM.CODE]
        };
      });
      this.loading = false;
    },

    getNameDisplay(properties: any[]) {
      if (isArrayHasLength(properties)) {
        const names = properties.map(property => property.name);
        return names.join(", ");
      }
      return "";
    },

    async init() {
      await this.getUnmapped();
      await this.getTaskTypes();
      if (this.taskIri) {
        await this.setIriExists();
        const updateTask = await EntityService.getPartialEntity(this.taskIri, []);
        this.name = updateTask[RDFS.LABEL];
        this.type = updateTask[RDF.TYPE][0];
        const children = await EntityService.getEntityChildren(this.taskIri);
        this.contents = children.map(child => {
          return { iri: child["@id"], name: child.name };
        });
      }
    },

    isObjectHasKeys(object: any, keys?: string[]) {
      return isObjectHasKeys(object, keys);
    },

    isArrayHasLength(array: any) {
      return isArrayHasLength(array);
    },

    view(iri: string) {
      if (iri) DirectService.directTo(Env.VIEWER_URL, iri, this, "concept");
    },

    showInfo(iri: string) {
      if (iri) this.$emit("showDetails", iri);
    },

    async search(): Promise<void> {
      this.loading = true;
      if (this.searchTerm.length > 0) {
        this.searchResults = [];
        const searchRequest = new SearchRequest();
        searchRequest.termFilter = this.searchTerm;
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
      } else {
        await this.getUnmapped();
      }
      this.loading = false;
    },

    setFilters(searchRequest: Models.Search.SearchRequest) {
      searchRequest.schemeFilter = this.selectedFilters.scheme;
      searchRequest.statusFilter = this.selectedFilters.status;
      searchRequest.typeFilter = this.selectedFilters.type;
    },

    async fetchSearchResults(searchRequest: Models.Search.SearchRequest, cancelToken: any) {
      const result = await this.$entityService.advancedSearch(searchRequest, cancelToken);
      if (result && isArrayHasLength(result)) {
        this.searchResults = result.map(item => {
          return { iri: item.iri, name: item.name, type: item.entityType, scheme: item.scheme, status: item.status, usage: item.weighting };
        });
      } else {
        this.searchResults = [];
      }
      console.log(this.searchResults);
      this.unmapped = this.searchResults;
    },

    searchFilter() {
      console.log("search");
    },

    async save() {
      this.saveLoading = true;
      const entity = this.buildEntity();
      if (!(await EntityService.iriExists(entity["@id"]))) {
        const created = await EntityService.createEntity(entity);
        for (const action of this.contents) {
          await EntityService.addTaskAction(action.iri, created["@id"]);
        }
      } else {
        const updated = await EntityService.updateEntity(entity);
        for (const action of this.contents) {
          await EntityService.addTaskAction(action.iri, updated["@id"]);
        }
      }
      this.saveLoading = false;
    },

    buildEntity() {
      const entity = { "@id": this.taskIri } as any;
      entity[RDFS.LABEL] = this.name;
      entity[RDF.TYPE] = [this.type];
      entity[IM.HAS_STATUS] = { "@id": IM.ACTIVE, name: "Active" };
      entity[IM.IS_CONTAINED_IN] = { "@id": IM.NAMESPACE + "Tasks", name: "Tasks" };
      return entity;
    }
  }
});
</script>

<style scoped>
.task-definition-container {
  flex: 0 1 auto;
  overflow: auto;
  width: 100%;
  height: calc(100vh - 11.6rem);
  padding: 2.5rem 1rem 1rem 1rem;
  row-gap: 1.75rem;
  background-color: #ffffff;
}

.definition-main-container {
  background-color: #ffffff;
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

.field {
  padding: 0.3rem;
  margin: 0.5rem;
  /* padding-bottom: 0.5rem; */
}

.input-text {
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.pick-list-row {
  display: flex;
  align-items: center;
}

.row-button:hover {
  background-color: #6c757d !important;
  color: #ffffff !important;
  z-index: 2;
}

label {
  font-size: 1rem !important;
}
.p-field {
  margin-top: 2rem;
}

.title {
  padding: 1rem 1rem 0 1rem;
}
</style>
