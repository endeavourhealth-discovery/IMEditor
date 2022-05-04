<template>
  <ConfirmDialog></ConfirmDialog>
  <div class="grid grid-nogutter">
    <div class="col-3 tree-bar-container">
      <Tree
        :value="root"
        selectionMode="single"
        v-model:selectionKeys="selectedNode"
        @node-select="onNodeSelect"
        :loading="loading"
        class="task-definition-container"
      >
        <template #default="slotProps">
          <span :style="'color: ' + slotProps.node.colour" class="p-mx-1 type-icon">
            <font-awesome-icon :icon="slotProps.node.icon" />
          </span>
          <span>{{ slotProps.node.label }}</span>
          <span style="color: red" class="p-mx-1 delete-icon clickable">
            <font-awesome-icon :icon="['fas', 'trash']" @click="deleteTaskAction(slotProps.node)" />
          </span>
        </template>
        <template #task="slotProps">
          <div @drop="onDrop(slotProps.node)" @dragover.prevent @dragenter.prevent @dblclick="editFolder(slotProps.node)">
            <span :style="'color: ' + slotProps.node.colour" class="p-mx-1 type-icon">
              <font-awesome-icon :icon="slotProps.node.icon" />
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
      <TabView :lazy="true" class="tabView">
        <TabPanel header="List">
          <ExpansionTable
            :contents="unassigned"
            :drag="true"
            @startDrag="startDrag"
            :loading="loading"
            :expandable="true"
            :selectable="true"
            @select="tableSelect"
            @unselect="tableUnselect"
            @selectAll="selectAll"
            @unselectAll="unselectAll"
            class="tab-container"
          />
        </TabPanel>
        <TabPanel header="Contents">
          <ExpansionTable :contents="selected.contents" :expandable="true" class="tab-container" />
        </TabPanel>
        <TabPanel header="Search">
          <ExpansionTable
            :contents="searchResults"
            :inputSearch="true"
            @search="search"
            :paginable="true"
            :drag="true"
            @startDrag="startDrag"
            :selectable="true"
            @select="tableSelect"
            @unselect="tableUnselect"
            @selectAll="selectAll"
            @unselectAll="unselectAll"
            class="tab-container"
          />
        </TabPanel>

        <TabPanel header="Hierarchy position" class="tab-container">
          <SecondaryTree :conceptIri="selected.data" />
        </TabPanel>
      </TabView>
    </div>
  </div>
  <div class="button-bar flex flex-row justify-content-end" id="mapping-button-bar">
    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
    <Button icon="pi pi-folder" label="Add to task" class="p-button-help" @click="addSelectedToFolder" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" />
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
import { Namespace, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";

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
  name: "Mapper",
  components: {
    ConfirmDialog,
    VueJsonPretty,
    ExpansionTable,
    MultipleTaskSelection
  },

  beforeRouteLeave(to, from, next) {
    if (to.matched[0].path === "/mapper") {
      next();
    } else {
      this.$confirm.require({
        message: "All unsaved changes will be lost. Are you sure you want to proceed?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        accept: () => {
          next();
        }
      });
    }
  },
  props: ["data"],
  emits: ["nextPage", "prevPage"],
  computed: {
    ...mapState(["filterOptions", "refreshTree"])
  },
  watch: {
    refreshTree() {
      this.init();
    }
  },
  data() {
    return {
      pageIndex: 0,
      root: [] as any[],
      selectedNode: {} as any,
      selected: {} as any,
      unassigned: [] as any[],
      contentHeight: "",
      loading: true,
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      draggedItem: {} as any,
      tableSelectedList: [] as any[],
      displayAddToTask: false,
      tasks: [] as any[]
    };
  },
  async mounted() {
    this.loading = true;
    await this.init();
    window.addEventListener("resize", this.onResize);
    this.onResize();
    this.loading = false;
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },
  methods: {
    async init() {
      await this.getUnassigned();
      await this.getTasks();
    },

    isArrayHasLength(array: any) {
      return isArrayHasLength(array);
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
        node.icon = getFAIconFromType(node.type);
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
            icon: getFAIconFromType(child.type),
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
        return { iri: node.data, name: node.label, type: node.type || node[RDF.TYPE], children: this.getTableDataFromNodes(node.children) };
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
      await EntityService.removeTaskAction(removedNode.parentKey, removedNode.key);
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
    },

    async getUnassigned() {
      const unassigned = await EntityService.getUnassigned();
      this.unassigned = unassigned.slice(1, 10);
    },

    onResize(): void {
      this.setContentHeight();
    },

    setContentHeight(): void {
      this.contentHeight =
        "height: " + getContainerElementOptimalHeight("mapper-main-container", ["p-panel-header", "p-tabview-nav", "button-bar"], true, 4, 4) + ";";
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
      this.$emit("nextPage", { pageIndex: this.pageIndex });
    }
  }
});
</script>

<style scoped>
.tree-bar-container {
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
}

.title {
  font-size: 2rem;
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

.tabView {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.delete-icon {
  padding-left: 0.5rem;
}

.type-icon {
  padding-right: 0.5rem;
}

.drop-zone {
  background-color: #eee;
  margin-bottom: 10px;
  padding: 10px;
}

.drag-el {
  background-color: #fff;
  margin-bottom: 10px;
  padding: 5px;
  cursor: pointer;
}

.drag-el:hover {
  background-color: #6c757d;
  color: #ffffff;
}

.task-definition-container {
  height: calc(100vh - 18.6rem);
  overflow: auto;
}

.tab-container {
  height: calc(100vh - 21.5rem);
  overflow: auto;
}
</style>
