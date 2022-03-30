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
            <Listbox
              v-model="selected"
              :options="unassigned"
              optionLabel="name"
              listStyle="height:95%;"
              :filter="true"
              filterPlaceholder="Search"
              @change="onChange"
            />
          </div>
          <div class="col">
            <TabView :lazy="true" class="tabView">
              <TabPanel header="JSON">
                <VueJsonPretty class="json" :data="selectedView" />
              </TabPanel>
              <TabPanel header="Suggestions">
                <DataTable
                  :value="suggestions"
                  v-model:expandedRows="expandedRows"
                  v-model:selection="selectedSuggestions"
                  dataKey="name"
                  responsiveLayout="scroll"
                >
                  <Column selectionMode="multiple" headerStyle="width: 3em"></Column>
                  <Column :expander="true" headerStyle="width: 3rem" />
                  <Column field="name" header="Name">
                    <template #body="{data}">
                      {{ data["http://www.w3.org/2000/01/rdf-schema#label"] }}
                    </template>
                  </Column>
                  <Column field="type" header="Type">
                    <template #body="{data}">
                      {{ data?.["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"]?.map(type => type.name).join(", ") }}
                    </template>
                  </Column>
                  <Column field="code" header="Code">
                    <template #body="{data}">
                      {{ data["http://endhealth.info/im#code"] }}
                    </template></Column
                  >
                  <template #expansion="{data}">
                    <VueJsonPretty class="suggestion-json" :data="data" />
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
          <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
          <Button icon="pi pi-check" label="Save" class="save-button" @click="submit" />
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
      suggestions: [] as any[],
      loading: true
    };
  },
  async mounted() {
    this.loading = true;
    await this.getUnassigned();
    window.addEventListener("resize", this.onResize);
    this.loading = false;
    this.onResize();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },
  methods: {
    async onChange(event: any) {
      this.selectedView = await EntityService.getPartialEntity(event.value["@id"] as string, []);
      this.suggestions = await EntityService.getMappingSuggestions(event.value["@id"], event.value.name);
    },

    async getUnassigned() {
      this.unassigned = await EntityService.getUnassigned();
    },

    onResize(): void {
      this.setContentHeight();
    },

    submit(): void {
      console.log("submit");
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

#editor-button-bar {
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid #dee2e6;
  border-left: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-radius: 3px;
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

/* .suggestion-json {
  height: calc(100vh - 18.5rem);
} */
</style>
