<template>
  <div id="topbar-mapper-container">
    <TopBar>
      <template #content>
        <span class="title"><strong>IM Mapper</strong></span>
      </template>
    </TopBar>
    <ConfirmDialog></ConfirmDialog>
    <div id="mapper-main-container">
      <div class="grid grid-nogutter">
        <div class="col-3">
          <Tree :value="root" selectionMode="single" v-model:selectionKeys="selectedNode" @node-select="onNodeSelect">
            <template #default="slotProps">
              <div @drop="onDrop(slotProps.node)" @dragover.prevent @dragenter.prevent>
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
              <div v-for="item in unassigned" :key="item.iri" class="drag-el" draggable="true" @dragstart="startDrag(item)">
                {{ item.name }}
              </div>
            </TabPanel>
            <TabPanel header="Contents">
              <DataTable :value="selected.children" v-model:expandedRows="expandedRows" dataKey="data" responsiveLayout="scroll" @rowExpand="onRowExpand">
                <Column :expander="true" headerStyle="width: 3rem" />
                <Column field="name" header="Name">
                  <template #body="{data}">
                    {{ data.label }}
                  </template>
                </Column>
                <Column field="iri" header="Iri">
                  <template #body="{data}">
                    {{ data.data }}
                  </template>
                </Column>

                <template #expansion="{data}">
                  <VueJsonPretty v-if="data.expandView" class="suggestion-json" :data="data.expandView" />
                </template>
              </DataTable>
            </TabPanel>
            <TabPanel header="JSON">
              <VueJsonPretty class="json" :data="selectedView" />
            </TabPanel>
            <TabPanel header="Suggestions">
              <DataTable
                :value="selected.suggestions"
                v-model:expandedRows="expandedRows"
                v-model:selection="selectedSuggestions"
                dataKey="name"
                responsiveLayout="scroll"
                @rowExpand="onRowExpand"
              >
                <Column selectionMode="multiple" headerStyle="width: 3em"></Column>
                <Column :expander="true" headerStyle="width: 3rem" />
                <Column field="name" header="Name">
                  <template #body="{data}">
                    {{ data.name }}
                  </template>
                </Column>
                <Column field="iri" header="Iri">
                  <template #body="{data}">
                    {{ data["@id"] }}
                  </template>
                </Column>

                <template #expansion="{data}">
                  <VueJsonPretty v-if="data.expandView" class="suggestion-json" :data="data.expandView" />
                </template>
              </DataTable>
            </TabPanel>
            <TabPanel header="Search">
              <DataTable
                :paginator="true"
                :rows="10"
                paginatorTemplate="CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords}"
                :value="searchResults"
                v-model:expandedRows="expandedRows"
                v-model:selection="selectedSuggestions"
                dataKey="name"
                responsiveLayout="scroll"
                @rowExpand="onRowExpand"
              >
                <template #header>
                  <div class="flex justify-content-end">
                    <span class="p-input-icon-left ">
                      <i class="pi pi-search" />
                      <InputText v-model="searchTerm" type="text" placeholder="Search" @input="search" />
                    </span>
                  </div>
                </template>
                <Column selectionMode="multiple" headerStyle="width: 3em"></Column>
                <Column :expander="true" headerStyle="width: 3rem" />
                <Column field="name" header="Name">
                  <template #body="{data}">
                    {{ data.name }}
                  </template>
                </Column>
                <Column field="iri" header="Iri">
                  <template #body="{data}">
                    {{ data.iri }}
                  </template>
                </Column>

                <template #expansion="{data}">
                  <VueJsonPretty v-if="data.expandView" class="suggestion-json" :data="data.expandView" />
                </template>
              </DataTable>
            </TabPanel>
          </TabView>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import EntityService from "@/services/EntityService";
import ConfirmDialog from "primevue/confirmdialog";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import axios from "axios";
import { Namespace, TTIriRef, EntityReferenceNode, ComponentDetails, NextComponentSummary, TreeNode } from "im-library/dist/types/interfaces/Interfaces";

const { IM, RDF } = Vocabulary;
const {
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight }
} = Helpers;
const {
  Search: { ConceptSummary, SearchRequest }
} = Models;
const { ComponentType, BuilderType, SortBy } = Enums;

export default defineComponent({
  name: "Mapper",
  components: {
    ConfirmDialog,
    VueJsonPretty
  },
  beforeRouteLeave(to, from, next) {
    this.$confirm.require({
      message: "All unsaved changes will be lost. Are you sure you want to proceed?",
      header: "Confirmation",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        next();
      }
    });
  },
  watch: {
    async selected() {
      if (this.selected.data) {
        this.selectedView = await EntityService.getPartialEntity(this.selected.data, []);
        this.selected.suggestions = await EntityService.getMappingSuggestions(this.selected.data, this.selected.label);
        this.selected.children = await EntityService.getEntityChildren(this.selected.data);
        this.selectedSuggestions = [];
      }
    }
  },
  computed: {
    ...mapState(["editorIri", "editorSavedEntity", "currentUser", "isLoggedIn", "filterOptions", "selectedFilters"])
  },
  data() {
    return {
      root: [] as any[],
      selectedNode: {} as any,
      expandedRows: [],
      selected: {} as any,
      selectedSuggestions: [] as any[],
      unassigned: [] as any[],
      contentHeight: "",
      selectedView: {},
      mappedlist: [] as any[],
      visibleFull: false,
      searchTerm: "",
      loading: true,
      searchResults: [] as Models.Search.ConceptSummary[],
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
      // this.selected = this.unassigned[0];
    },

    startDrag(item: any) {
      this.draggedItem = item;
    },

    async onDrop(node: any) {
      const entityType = await EntityService.getPartialEntity(this.draggedItem.iri, [RDF.TYPE]);
      node.children.push({
        key: node.key + node.children.length.toString(),
        label: this.draggedItem.name,
        data: this.draggedItem.iri,
        children: [],
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

      delete node.class;
      delete node.type;
    },

    deleteNewFolder(node: any) {
      const i = this.root.findIndex(rootNode => rootNode.key === node.key);
      this.root.splice(i, 1);
    },

    onNodeSelect(node: any) {
      this.selected = node;
    },

    async onRowExpand(event: any) {
      event.data.expandView = await EntityService.getPartialEntity(event.data["@id"] || event.data.iri || event.data.data, []);
    },

    autoMap() {
      this.loading = true;
      for (const unassigned of this.unassigned) {
        this.selected = unassigned;
        if (isArrayHasLength(unassigned.suggestions)) {
          this.selectedSuggestions = unassigned.suggestions;
          this.map();
        }
      }
      this.$toast.add({
        severity: "success",
        summary: "Auto map complete",
        detail: this.mappedlist.length + " unassigned entities have been mapped"
      });
      this.loading = false;
    },
    map() {
      const mappedUnassigned = this.selected;
      const i = this.unassigned.findIndex(unassigned => this.selected.iri === unassigned.iri);
      this.unassigned.splice(i, 1);
      for (const suggestion of this.selectedSuggestions) {
        console.log(suggestion);
        mappedUnassigned[IM.MATCHED_TO] = suggestion["@id"] || suggestion.iri;
      }
      this.mappedlist.push(mappedUnassigned);
      this.selected = this.unassigned[i];
    },
    isObjectHasKeys(object: any) {
      return isObjectHasKeys(object);
    },

    isArrayHasLength(object: any) {
      return isArrayHasLength(object);
    },

    async getUnassigned() {
      const unassigned = await EntityService.getUnassigned();
      this.unassigned = unassigned.slice(1, 10);
    },

    onResize(): void {
      this.setContentHeight();
    },

    closeMaps() {
      this.visibleFull = false;
    },

    submit(): void {
      this.closeMaps();
      this.mappedlist = [];
      this.init();
    },

    isObjectHasKeysWrapper(object: any): boolean {
      return isObjectHasKeys(object);
    },

    setContentHeight(): void {
      this.contentHeight =
        "height: " + getContainerElementOptimalHeight("mapper-main-container", ["p-panel-header", "p-tabview-nav", "button-bar"], true, 4, 4) + ";";
    },

    async search(): Promise<void> {
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
        this.searchResults = result;
      } else {
        this.searchResults = [];
      }
    }
  }
});
</script>

<style scoped>
#topbar-mapper-container {
  height: 100vh;
  width: 100vw;
  overflow: auto;
}

#mapper-main-container {
  width: 100%;
  height: calc(100% - 93.81px);
  overflow-y: auto;
}

.mapper-panel-buttons-container {
  height: 100%;
  width: 100%;
}

.loading-container {
  width: 100%;
  height: 100%;
}

.content-json-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  gap: 1rem;
}

.json-container {
  width: 50%;
  /* height: 100%; */
}

.content {
  width: 50%;
  height: 100%;
}

.json {
  height: 100%;
  width: 100%;
  overflow: auto;
  /* border: 1px #dee2e6 solid; */
  border-radius: 3px;
}

.placeholder {
  height: 100%;
}

.panel-content {
  overflow-y: auto;
}

.title {
  font-size: 2rem;
}

#editor-button-bar,
#map-button-bar {
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  background-color: #ffffff;
}

.p-listbox {
  height: calc(100vh - 13.5rem);
  word-wrap: break-word;
}

.p-listbox-list {
  height: calc(100vh - 4rem);
}

.tabView {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.p-datatable-wrapper,
.p-datatable,
.p-datatable-tbody,
.p-datatable-table {
  height: calc(100vh - 18.5rem);
}

.json {
  height: calc(100vh - 18.5rem);
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
