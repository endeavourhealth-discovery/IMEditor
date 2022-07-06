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
import ExpansionTable from "@/components/workflow/ExpansionTable.vue";
import ParentHeader from "./ParentHeader.vue";
import { Vocabulary, Helpers } from "im-library";

const { IM, RDF } = Vocabulary;
const {
  ConceptTypeMethods: { getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;

export default defineComponent({
  name: "TaskViewer",
  components: {
    ConfirmDialog,
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
    }
  },
  watch: {
    "$route.params.taskIri"() {
      this.init();
    }
  },
  data() {
    return {
      root: [] as any[],
      selectedNode: {} as any,
      selected: {} as any,
      loading: true,
      tasks: [] as any[]
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

    async init() {
      await this.getTasks();
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
