<template>
  <ConfirmDialog></ConfirmDialog>
  <Card class="task-definition-container">
    <template #header>
      <span class="field p-float-label">
        <InputText id="name" type="text" class="p-inputtext-lg input-text" v-model="createTask.name" />
        <label for="name">Name</label>
      </span>
      <span class="field p-float-label">
        <Dropdown class="p-inputtext-lg input-text" id="type" v-model="createTask.type" :options="taskTypes" optionLabel="name" />
        <label for="type">Type</label>
      </span>
    </template>
    <template #content>
      <PickList v-model="pickLists" dataKey="iri" v-model:selection="selection">
        <template #sourceheader>
          <div class="flex justify-content-center align-items-center">
            <span class="p-input-icon-left">
              <i class="pi pi-search" />
              <InputText type="text" v-model="searchTerm" placeholder="Search" @keydown.enter="search" />
            </span>
            <i v-if="loading" class="pi pi-spin pi-spinner" />
            <Button icon="pi pi-fw pi-eye" class="p-button-rounded p-button-text p-button-plain row-button" @click="view" v-tooltip.top="'View'" />
            <Button icon="pi pi-fw pi-info-circle" class="p-button-rounded p-button-text p-button-plain row-button" @click="showInfo" v-tooltip.top="'Info'" />
          </div>
        </template>
        <template #targetheader>
          Task contents
        </template>
        <template #item="slotProps">
          {{ slotProps.item.name }}
        </template>
      </PickList>
    </template>
  </Card>
  <div class="button-bar">
    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
    <Button :loading="saveLoading" icon="pi pi-check" label="Save" class="save-button" @click="save" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import EntityService from "@/services/EntityService";
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
  name: "Mapper",
  components: {
    ConfirmDialog,
    VueJsonPretty,
    ExpansionTable,
    MultipleTaskSelection
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
    async searchTerm() {
      if (!this.searchTerm.length) {
        await this.getPredefinedList();
      }
    }
  },
  data() {
    return {
      pageIndex: 0,
      pickLists: [[] as any, [] as any],
      createTask: { contents: [] } as any,
      selection: [] as any[],
      loading: true,
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      searchTerm: "",
      saveLoading: false,
      taskTypes: [
        {
          "@id": "http://endhealth.info/im#Task",
          name: "Task"
        }
      ],
      predefinedListOptions: [
        { name: "Unmapped", path: "unmapped" },
        { name: "Unassigned", path: "unassigned" },
        { name: "Unclassified", path: "unclassified" }
      ]
    };
  },
  async mounted() {
    this.loading = true;
    await this.init();
    this.loading = false;
  },
  methods: {
    showDetails(selectedIri: string) {
      this.$emit("showDetails", selectedIri);
    },

    async getPredefinedList() {
      this.pickLists[0] = (await EntityService.getPredefinedList("unmapped")).map(unmapped => {
        return { iri: unmapped["@id"], name: unmapped.name || unmapped[RDFS.LABEL] };
      });
    },

    async init() {
      await this.getPredefinedList();
    },

    isObjectHasKeys(object: any, keys?: string[]) {
      return isObjectHasKeys(object, keys);
    },

    isArrayHasLength(array: any) {
      return isArrayHasLength(array);
    },

    getTableDataFromNodes(nodes: any) {
      if (!isArrayHasLength(nodes)) return [];
      return nodes.map((node: any) => {
        return {
          iri: node.data,
          name: node.label,
          type: node.type || node[RDF.TYPE],
          scheme: node.scheme,
          children: this.getTableDataFromNodes(node.children)
        };
      });
    },

    async addActionToTask(entityIri: string, taskIri: string) {
      await EntityService.addTaskAction(entityIri, taskIri);
    },

    view() {
      if (isArrayHasLength(this.selection) && isArrayHasLength(this.selection[0]))
        DirectService.directTo(Env.VIEWER_URL, this.selection[0][0].iri, this, "concept");
    },

    showInfo() {
      if (isArrayHasLength(this.selection) && isArrayHasLength(this.selection[0])) this.$emit("showDetails", this.selection[0][0].iri);
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
      }
      this.loading = false;
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

      this.pickLists[0] = this.searchResults;
    },
    next() {
      this.$emit("nextPage", { pageIndex: this.pageIndex, data: {} });
    },

    async save() {
      this.saveLoading = true;
      const entity = { "@id": IM.NAMESPACE + this.createTask.name } as any;
      entity[RDFS.LABEL] = this.createTask.name;
      entity[RDF.TYPE] = [this.createTask.type];
      entity[IM.HAS_STATUS] = { "@id": IM.ACTIVE, name: "Active" };
      entity[IM.IS_CONTAINED_IN] = { "@id": IM.NAMESPACE + "Tasks", name: "Tasks" };
      if (!(await EntityService.iriExists(entity["@id"]))) {
        const created = await EntityService.createEntity(entity);
        for (const action of this.pickLists[1]) {
          await EntityService.addTaskAction(created["@id"], action.iri);
        }
      }
      this.saveLoading = false;
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
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
  row-gap: 1.75rem;
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
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.input-text {
  width: 100%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.p-picklist-listwrapper {
  height: calc(100vh - 1.6rem);
}
</style>
