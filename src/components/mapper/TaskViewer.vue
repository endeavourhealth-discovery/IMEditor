<template>
  <div class="viewer-main-container">
    <h5>Task Viewer</h5>
    <div class="task-viewer-container">
      <div class="tree-bar-container col-3">
        <Tree
          :value="root"
          selectionMode="single"
          v-model:selectionKeys="selectedNode"
          @node-select="onNodeSelect"
          :loading="loading"
          class="task-tree-container"
        >
          <template #default="slotProps">
            <span :style="'color: ' + slotProps.node.colour" class="p-mx-1 type-icon">
              <i :class="slotProps.node.treeIcon" aria-hidden="true" />
            </span>
            <span>{{ slotProps.node.label }}</span>
          </template>
        </Tree>
        <Button label="Create task" @click="createTask" />
      </div>
      <div class="col">
        <div class="tabView">
          <div class="header-container"><ParentHeader :concept-iri="selected.key" @show-details="showDetails" /></div>
          <ExpansionTable :contents="selected.contents" :loading="loading" :show-actions="true" @show-details="showDetails" class="tab-container" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import EntityService from "@/services/EntityService";
import ConfirmDialog from "primevue/confirmdialog";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";
import MultipleTaskSelection from "@/components/mapper/MultipleTaskSelection.vue";
import ParentHeader from "./ParentHeader.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import axios from "axios";
import { Namespace, EntityReferenceNode, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";

const { IM, RDF, RDFS } = Vocabulary;
const {
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType, isOfTypes },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
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
    MultipleTaskSelection,
    ParentHeader
  },
  props: {
    data: { type: Object, required: true }
  },
  emits: {
    showDetails: (_payload: string) => true,
    updateSelected: (_payload: string) => true
  },
  computed: {
    isTaskSelected() {
      return isObjectHasKeys(this.selected) && this.selected.type === "task";
    },
    ...mapState(["filterOptions", "refreshTree"])
  },
  watch: {
    selected() {
      console.log(this.selected);
    }
  },
  data() {
    return {
      pageIndex: 0,
      root: [] as any[],
      selectedNode: {} as any,
      selected: {} as any,
      contentHeight: "",
      loading: true,
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      draggedItem: {} as any,
      tableSelectedList: [] as any[],
      tasks: [] as any[],
      predefinedListMap: new Map(),
      selectedListOption: {} as { name: string; path: string },
      selectedList: [] as any[]
    };
  },
  async mounted() {
    this.loading = true;
    this.predefinedListMap = new Map();
    await this.init();
    this.loading = false;
  },
  methods: {
    showDetails(selectedIri: string) {
      console.log(selectedIri);
      this.$emit("showDetails", selectedIri);
    },
    async getPredefinedList(refresh: boolean, listName: string) {
      this.loading = true;
      if (!this.predefinedListMap.has(listName) || refresh) {
        const list = (await EntityService.getPredefinedList(listName)).map(unmapped => {
          return { iri: unmapped["@id"], name: unmapped.name || unmapped[RDFS.LABEL] };
        });
        this.predefinedListMap.set(listName, list);
      }

      this.selectedList = this.predefinedListMap.get(listName);
      this.loading = false;
    },

    async init() {
      await this.getTasks();
    },

    isObjectHasKeys(object: any, keys?: string[]) {
      return isObjectHasKeys(object, keys);
    },

    isArrayHasLength(array: any) {
      return isArrayHasLength(array);
    },

    startTask() {
      console.log("Start task");
    },

    async addSelectedToFolder() {
      const tasks = (await EntityService.getEntityChildren(IM.MODULE_TASKS)) as any[];
      this.tasks = tasks.map(task => {
        return { iri: task["@id"], name: task.name, type: task.type };
      });
    },

    tableSelect(tableSelected: any) {
      this.tableSelectedList.push(tableSelected);
    },

    tableUnselect(tableUnselected: any) {
      this.tableSelectedList = this.tableSelectedList.filter(selected => selected.iri !== tableUnselected.iri);
    },

    async getTasks() {
      this.root = [];
      const root = (await EntityService.getEntityChildren(IM.MODULE_TASKS)) as any[];
      for (const node of root) {
        node.children = [];
        node.key = node["@id"];
        node.treeIcon = getFAIconFromType(node.type);
        node.colour = getColourFromType(node.type);
        node.type = "task";
        node.label = node.name;
        const children = (await EntityService.getEntityChildren(node["@id"])) as any[];
        node.children = children.map(child => {
          return {
            key: child["@id"],
            label: child.name,
            data: child["@id"],
            children: [],
            type: child.type,
            treeIcon: getFAIconFromType(child.type),
            colour: getColourFromType(child.type),
            parentKey: node.key
          };
        });
        node.contents = this.getTableDataFromNodes(node.children);
      }
      this.root = root;
    },

    editFolder(node: any) {
      node.type = "newFolder";
    },

    getTableDataFromNodes(nodes: any) {
      if (!isArrayHasLength(nodes)) return [];
      return nodes.map((node: any) => {
        return {
          iri: node.data,
          name: node.label,
          type: node.type || node[RDF.TYPE],
          children: this.getTableDataFromNodes(node.children)
        };
      });
    },

    startDrag(item: any) {
      this.draggedItem = item;
    },

    async onDrop(node: any) {
      this.loading = true;
      const entity = { "@id": this.draggedItem.iri } as any;
      entity[IM.IN_TASK] = node["@id"];
      await this.addActionToTask(this.draggedItem.iri, node["@id"]);
      await this.getTasks();
      this.selectedNode = {};
      this.loading = false;
    },

    async addActionToTask(entityIri: string, taskIri: string) {
      await EntityService.addTaskAction(entityIri, taskIri);
    },

    async addActionsToTasks(data: any[]) {
      for (const action of this.tableSelectedList) {
        for (const task of data) {
          await this.addActionToTask(action.iri, task.iri);
        }
      }
      await this.getTasks();
      this.loading = false;
    },

    async deleteTaskAction(removedNode: any) {
      this.loading = true;
      await EntityService.removeTaskAction(this.selected.key, removedNode.iri);
      await this.getTasks();
      this.loading = false;
    },

    createTask() {
      this.$router.push({ name: "TaskDefinition", params: { iri: "" } });
    },

    editTask(iri: string) {
      this.$router.push({ name: "TaskDefinition", params: { iri: iri } });
    },

    onNodeSelect(node: any) {
      this.selected = node;
      this.$emit("updateSelected", node.key);
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
.tree-bar-container {
  display: flex;
  flex-flow: column nowrap;
  background-color: #ffffff;
}

.task-viewer-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
  background-color: #ffffff;
}

.tab-container {
  height: calc(100vh - 22rem);
  overflow: auto;
}

.task-tree-container {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.type-icon {
  padding-right: 0.5rem;
}

.header-container {
  display: flex;
  flex-flow: column nowrap;
}

.viewer-main-container {
  background-color: #ffffff;
}
</style>
