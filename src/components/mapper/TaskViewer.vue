<template>
  <ConfirmDialog></ConfirmDialog>
  <div class="task-definition-container">
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
        <template #task="slotProps">
          <div @drop="onDrop(slotProps.node)" @dragover.prevent @dragenter.prevent @dblclick="editFolder(slotProps.node)">
            <span :style="'color: ' + slotProps.node.colour" class="p-mx-1 type-icon">
              <i :class="slotProps.node.treeIcon" aria-hidden="true" />
            </span>
            <span>{{ slotProps.node.label }}</span>
          </div>
        </template>
        <template #newFolder="slotProps">
          <InputText
            type="text"
            aria-describedby="foldername-help"
            v-model="slotProps.node.label"
            v-on:keyup.enter="saveNewFolder(slotProps.node)"
            :class="slotProps.node.class"
            @dblclick="slotProps.node.type = 'newFolder'"
          />
          <Button icon="pi pi-check" class="p-button-rounded p-button-text" @click="saveNewFolder(slotProps.node)" />
          <Button icon="pi pi-times" class="p-button-rounded p-button-danger p-button-text" @click="deleteNewFolder(slotProps.node)" />
          <div>
            <small v-if="slotProps.node.class === 'p-invalid'" id="foldername-help" class="p-error">{{ slotProps.node.message }}</small>
          </div>
        </template>
      </Tree>
      <Button label="Add folder" @click="addNewFolder" />
    </div>
    <div class="col">
      <div class="tabView">
        <ExpansionTable
          :contents="selected.contents"
          :removableRows="true"
          :loading="loading"
          @remove="deleteTaskAction"
          :show-actions="true"
          @show-details="showDetails"
          class="tab-container"
        />
      </div>
    </div>
  </div>
  <div class="button-bar">
    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
    <!-- <Button icon="pi pi-folder" label="Add to task" class="p-button-help" @click="addSelectedToFolder" /> -->
    <Button icon="pi pi-check" label="Start Task" class="save-button" @click="startTask" />
  </div>

  <Dialog header="Select task" v-if="isArrayHasLength(tasks)" v-model:visible="displayAddToTask">
    <MultipleTaskSelection :tasks="tasks" @addToTasks="addActionsToTasks" @closeTaskDialog="displayAddToTask = false" />
  </Dialog>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import EntityService from "@/services/EntityService";
import ConfirmDialog from "primevue/confirmdialog";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";
import MultipleTaskSelection from "@/components/mapper/MultipleTaskSelection.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import axios from "axios";
import { Namespace, EntityReferenceNode, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";

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
    ...mapState(["filterOptions", "refreshTree"])
  },
  watch: {
    async refreshTree() {
      await this.init();
      await this.getPredefinedList(true, this.selectedListOption.path);
      this.unselectAll();
    },

    async selectedListOption() {
      await this.getPredefinedList(false, this.selectedListOption.path);
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
      displayAddToTask: false,
      tasks: [] as any[],
      predefinedListOptions: [
        { name: "Unmapped", path: "unmapped" },
        { name: "Unassigned", path: "unassigned" },
        { name: "Unclassified", path: "unclassified" }
      ],
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
      this.selectedListOption = this.predefinedListOptions[0];
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
      this.displayAddToTask = true;
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
      this.displayAddToTask = false;
    },

    async deleteTaskAction(removedNode: any) {
      this.loading = true;
      await EntityService.removeTaskAction(this.selected.key, removedNode.iri);
      await this.getTasks();
      this.loading = false;
    },

    addNewFolder() {
      this.root.push({
        key: this.root.length.toString(),
        label: "",
        data: "",
        type: "newFolder",
        children: [],
        icon: getFAIconFromType([{ "@id": IM.TASK, name: "" }]),
        colour: getColourFromType([{ "@id": IM.TASK, name: "" }])
      });
    },

    async saveNewFolder(node: any) {
      if (!node.label) {
        node.class = "p-invalid";
        node.message = "Name undefined";
        return;
      }

      const nameExists = this.root.findIndex(rootNode => rootNode.label === node.label && rootNode.type !== "newFolder");
      const iri = IM.NAMESPACE + (node.label as string).replaceAll(" ", "");
      const iriEntity = await EntityService.getPartialEntity(iri, []);
      if (nameExists !== -1 || isObjectHasKeys(iriEntity, [RDFS.LABEL])) {
        node.class = "p-invalid";
        node.message = "Task already exists";
        return;
      }

      node.data = iri;
      node.type = "task";
      delete node.class;
      await EntityService.createTask(this.buildEntityFromNode(node));
      this.getTasks();
    },

    buildEntityFromNode(node: any) {
      const entity = {} as any;
      entity[RDFS.LABEL] = node.label;
      entity["@id"] = node.data;
      return entity;
    },

    deleteNewFolder(node: any) {
      const i = this.root.findIndex(rootNode => rootNode.key === node.key);
      if (i !== -1) this.root.splice(i, 1);
    },

    onNodeSelect(node: any) {
      this.selected = node;
      this.$emit("updateSelected", node.key);
    },

    selectAll(selectedList: any[]) {
      this.tableSelectedList = selectedList;
    },

    unselectAll() {
      this.tableSelectedList = [];
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
    },
    next() {
      this.$emit("nextPage", { pageIndex: this.pageIndex, data: {} });
    }
  }
});
</script>

<style scoped>
.predefined-list-dropdown {
  display: flex;
  margin-bottom: 1rem;
}

.tree-bar-container {
  display: flex;
  flex-flow: column nowrap;
  background-color: #ffffff;
}

.task-definition-container {
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
  height: calc(100vh - 12.6rem);
  overflow: auto;
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

.task-tree-container {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.tabView {
  display: flex;
  flex-direction: column;
}

.delete-icon {
  padding-left: 0.5rem;
}

.type-icon {
  padding-right: 0.5rem;
}
</style>
