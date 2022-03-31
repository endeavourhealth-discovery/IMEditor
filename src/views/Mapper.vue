<template>
  <div id="topbar-mapper-container">
    <TopBar>
      <template #content>
        <span class="title"><strong>IM Mapper</strong></span>
      </template>
    </TopBar>
    <ConfirmDialog></ConfirmDialog>
    <div id="mapper-main-container">
      <div class="loading-container flex flex-row justify-content-center align-items-center" v-if="loading">
        <ProgressSpinner />
      </div>
      <div v-else class="mapper-panel-buttons-container">
        <div class="grid grid-nogutter">
          <div class="col-2">
            <Listbox v-model="selected" :options="unassigned" optionLabel="name" listStyle="height:95%;" :filter="true" filterPlaceholder="Search" />
          </div>
          <div class="col">
            <TabView :lazy="true" class="tabView">
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
                {{ selectedView }}
              </TabPanel>
            </TabView>
          </div>
        </div>
        <div class="button-bar flex flex-row justify-content-end" id="editor-button-bar">
          <Button icon="pi pi-times" label="Cancel" class="p-button-warning" @click="$router.go(-1)" />
          <Button
            icon="pi pi-arrows-h"
            label="Map"
            class="p-button-secondary"
            :disabled="!isObjectHasKeys(selected) || !isArrayHasLength(selectedSuggestions)"
            @click="map"
          />
          <Button icon="pi pi-prime" label="Auto-Map" class="p-button-help" @click="autoMap" />
          <Button icon="pi pi-check" label="Next" class="p-button-primary" @click="visibleFull = true" />
        </div>
      </div>
      <Sidebar v-model:visible="visibleFull" :baseZIndex="1000" position="full">
        <h3>Maps</h3>

        <DataTable :value="mappedlist" dataKey="@id" responsiveLayout="scroll">
          <Column field="unassigned" header="Unassigned">
            <template #body="{data}"> {{ data.name }} | {{ data.iri }} </template>
          </Column>
          <Column field="matchedTo" header="Mapped to">
            <template #body="{data}">
              {{ data["http://endhealth.info/im#matchedTo"] }}
            </template>
          </Column>
        </DataTable>
        <div class="button-bar flex flex-row justify-content-end" id="map-button-bar">
          <Button icon="pi pi-check" label="Submit" class="p-button-primary" @click="submit" />
        </div>
      </Sidebar>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import EntityService from "@/services/EntityService";
import ConfirmDialog from "primevue/confirmdialog";
import { mapState } from "vuex";
import { Vocabulary, Helpers } from "im-library";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
const { IM, RDF } = Vocabulary;
const {
  ConceptTypeMethods: { isValueSet },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight }
} = Helpers;

export default defineComponent({
  name: "Editor",
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
      if (this.selected) {
        this.selectedView = await EntityService.getPartialEntity(this.selected.iri, []);
        this.selected.suggestions = await EntityService.getMappingSuggestions(this.selected.iri, this.selected.name);
        this.selectedSuggestions = [];
      }
    }
  },
  computed: {
    ...mapState(["editorIri", "editorSavedEntity", "currentUser", "isLoggedIn"])
  },
  data() {
    return {
      expandedRows: [],
      selected: {} as any,
      selectedSuggestions: [] as any[],
      unassigned: [] as any[],
      contentHeight: "",
      selectedView: {},
      mappedlist: [] as any[],
      visibleFull: false,
      loading: true
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
      this.selected = this.unassigned[0];
    },

    async onRowExpand(event: any) {
      event.data.expandView = await EntityService.getPartialEntity(event.data["@id"], []);
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
        mappedUnassigned[IM.MATCHED_TO] = this.selected.iri;
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
      this.unassigned = await EntityService.getUnassigned();
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
</style>
