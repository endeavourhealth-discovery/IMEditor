<template>
  <ConfirmDialog></ConfirmDialog>
  <div class="grid grid-nogutter">
    <div class="col-3 tree-bar-container">
      <Tree :value="root" selectionMode="single" v-model:selectionKeys="selectedNode" @node-select="onNodeSelect">
        <template #default="slotProps">
          <span :style="'color: ' + slotProps.node.colour" class="p-mx-1 type-icon">
            <font-awesome-icon :icon="slotProps.node.icon" />
          </span>
          <span>{{ slotProps.node.label }}</span>
          <span style="color: red" class="p-mx-1 delete-icon clickable">
            <font-awesome-icon :icon="['fas', 'trash']" @click="deleteNewFolder(slotProps.node)" />
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
            :selectable="false"
            :inputSearch="false"
            :paginable="false"
            :drag="true"
            @startDrag="startDrag"
            :loading="loading"
          />
        </TabPanel>
        <TabPanel header="Contents">
          <ExpansionTable :contents="getTableDataFromNodes(selected.children)" :selectable="false" :inputSearch="false" :paginable="false" />
        </TabPanel>
        <TabPanel header="Details">
          <VueJsonPretty class="json" :data="selectedView" />
        </TabPanel>
        <TabPanel header="Suggestions">
          <ExpansionTable :contents="selected.suggestions" :selectable="true" :inputSearch="false" :paginable="true" />
        </TabPanel>
        <TabPanel header="Search">
          <ExpansionTable
            :contents="searchResults"
            :selectable="false"
            :inputSearch="true"
            @search="search"
            :paginable="true"
            :drag="true"
            @startDrag="startDrag"
          />
        </TabPanel>
      </TabView>
    </div>
  </div>
  <div class="button-bar flex flex-row justify-content-end" id="mapping-button-bar">
    <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import EntityService from "@/services/EntityService";
import ConfirmDialog from "primevue/confirmdialog";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import axios from "axios";
import { Namespace, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";

const { IM, RDF } = Vocabulary;
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
    ExpansionTable
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
  emits: ["nextPage"],
  watch: {
    async selected() {
      if (this.selected.data) {
        this.selectedView = await EntityService.getPartialEntity(this.selected.data, []);
        this.selected.suggestions = (await EntityService.getMappingSuggestions(this.selected.data, this.selected.label)).map((suggestion: any) => {
          return { iri: suggestion["@id"], name: suggestion.name, type: suggestion.type };
        });
        // this.selected.children = await EntityService.getEntityChildren(this.selected.data);
      }
    }
  },
  computed: {
    ...mapState(["editorIri", "editorSavedEntity", "currentUser", "isLoggedIn", "filterOptions", "selectedFilters"])
  },
  data() {
    return {
      pageIndex: 0,
      root: [] as any[],
      selectedNode: {} as any,
      selected: {} as any,
      unassigned: [] as any[],
      contentHeight: "",
      selectedView: {},
      loading: true,
      searchResults: [] as any[],
      request: {} as { cancel: any; msg: string },
      draggedItem: {} as any
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
    },

    editFolder(node: any) {
      node.type = "newFolder";
    },

    getTableDataFromNodes(nodes: any) {
      if (!isArrayHasLength(nodes)) return [];
      return nodes.map((node: any) => {
        return { iri: node.data, name: node.label, type: node.type, children: this.getTableDataFromNodes(node.children) };
      });
    },

    startDrag(item: any) {
      this.draggedItem = item;
    },

    async onDrop(node: any) {
      const entityType = await EntityService.getPartialEntity(this.draggedItem.iri, [RDF.TYPE]);
      node.children.push({
        key: node.key + "" + node.children.length,
        label: this.draggedItem.name,
        data: this.draggedItem.iri,
        children: [],
        type: entityType[RDF.TYPE],
        icon: getFAIconFromType(entityType[RDF.TYPE]),
        colour: getColourFromType(entityType[RDF.TYPE])
      });
    },

    addNewFolder() {
      this.root.push({
        key: this.root.length.toString(),
        label: "",
        data: "",
        type: "newFolder",
        children: [],
        icon: ["fas", "clipboard-check"],
        colour: "#4063b0; opacity: 0.5;"
      });
    },

    saveNewFolder(node: any) {
      if (!node.label) {
        node.class = "p-invalid";
        node.message = "Name undefined";
        return;
      }
      const nameExists = this.root.findIndex(rootNode => rootNode.label === node.label && rootNode.type !== "newFolder");
      if (nameExists !== -1) {
        node.class = "p-invalid";
        node.message = "Name already exists";
        return;
      }
      node.data = IM.NAMESPACE + (node.label as string).replaceAll(" ", "");
      node.type = "task";
      delete node.class;
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
      this.$emit("nextPage", { pageIndex: this.pageIndex, data: this.getTableDataFromNodes(this.root) });
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
</style>
