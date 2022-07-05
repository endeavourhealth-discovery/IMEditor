<template>
  <div class="viewer-main-container">
    <h5 class="title">Task Viewer</h5>
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
import ConfirmDialog from "primevue/confirmdialog";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";
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
const { SortBy } = Enums;

export default defineComponent({
  name: "Mapper",
  components: {
    ConfirmDialog,
    VueJsonPretty,
    ExpansionTable,
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
    isTaskSelected(): boolean {
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
      this.$emit("showDetails", selectedIri);
    },
    async getPredefinedList(refresh: boolean, listName: string) {
      this.loading = true;
      if (!this.predefinedListMap.has(listName) || refresh) {
        const list = (await this.$entityService.getPredefinedList(listName)).map((unmapped: any) => {
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
      const tasks = (await this.$entityService.getEntityChildren(IM.MODULE_TASKS)) as any[];
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
      const root = (await this.$entityService.getEntityChildren(IM.MODULE_TASKS)) as any[];
      for (const node of root) {
        node.children = [];
        node.key = node["@id"];
        node.treeIcon = getFAIconFromType(node.type);
        node.colour = getColourFromType(node.type);
        node.type = "task";
        node.label = node.name;
        const children = (await this.$entityService.getEntityChildren(node["@id"])) as any[];
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
      await this.$entityService.addTaskAction(entityIri, taskIri);
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
      await this.$entityService.removeTaskAction(this.selected.key, removedNode.iri);
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
  height: calc(100vh - 23rem);
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

.title {
  padding: 1rem 1rem 0 1rem;
}
</style>
