<template>
  <div id="topbar-editor-container">
    <TopBar>
      <template #content>
        <div class="topbar-content">
          <span class="title"><strong>IM Editor:</strong></span>
          <span class="entity-name" v-tooltip="{ value: entityName, class: 'name-tooltip' }">{{ entityName }}</span>
        </div>
      </template>
    </TopBar>
    <ConfirmDialog></ConfirmDialog>
    <div id="editor-main-container">
      <div class="loading-container" v-if="loading">
        <ProgressSpinner />
      </div>
      <div v-else class="content-buttons-container">
        <div class="content-json-container">
          <div class="content">
            <TabView v-model:activeIndex="active" class="tabview">
              <TabPanel header="Summary">
                <div class="panel-content" id="summary-editor-container">
                  <SummaryEditor
                    v-if="active === 0 && isObjectHasKeysWrapper(conceptUpdated)"
                    :updatedConcept="conceptUpdated"
                    @concept-updated="updateConcept"
                    mode="edit"
                  />
                </div>
              </TabPanel>
              <TabPanel header="Parents">
                <div class="panel-content" id="parents-editor-container">
                  <ParentsEditor
                    v-if="active === 1 && isObjectHasKeysWrapper(conceptUpdated)"
                    :updatedConcept="conceptUpdated"
                    @concept-updated="updateConcept"
                    mode="edit"
                  />
                </div>
              </TabPanel>
              <TabPanel v-if="isValueSet" header="Members">
                <div class="panel-content" id="member-editor-container">
                  <MemberEditor v-if="active === 2" :updatedConcept="conceptUpdated" @concept-updated="updateConcept" mode="edit" />
                </div>
              </TabPanel>
            </TabView>
          </div>
          <Divider v-if="showJson" layout="vertical" />
          <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>

            <VueJsonPretty v-if="isObjectHasKeysWrapper(conceptUpdated)" class="json" :path="'res'" :data="conceptUpdated" @click="handleClick" />
          </div>
          <Button
            class="p-button-rounded p-button-info p-button-outlined json-toggle"
            :label="showJson ? 'hide JSON' : 'show JSON'"
            @click="showJson = !showJson"
          />
        </div>
        <div class="button-bar" id="editor-button-bar">
          <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="refreshEditor" />
          <Button icon="pi pi-check" label="Save" class="save-button" @click="submit" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import SummaryEditor from "@/components/edit/SummaryEditor.vue";
import EntityService from "@/services/EntityService";
import ConfirmDialog from "primevue/confirmdialog";
import MemberEditor from "@/components/edit/MemberEditor.vue";
import ParentsEditor from "@/components/edit/ParentsEditor.vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { mapState } from "vuex";
import { Vocabulary, Helpers } from "im-library";
const { IM, RDF, RDFS } = Vocabulary;
const {
  ConceptTypeMethods: { isValueSet },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EntityValidator: { hasValidIri, hasValidName, hasValidParents, hasValidStatus, hasValidTypes }
} = Helpers;

export default defineComponent({
  name: "Editor",
  components: {
    ConfirmDialog,
    SummaryEditor,
    MemberEditor,
    VueJsonPretty,
    ParentsEditor
  },
  beforeRouteLeave() {
    this.confirmLeavePage();
  },
  beforeUnmount() {
    window.removeEventListener("beforeunload", this.beforeWindowUnload);
  },
  computed: {
    isValueSet(): any {
      return isValueSet(this.conceptUpdated[RDF.TYPE]);
    },
    toggleConfirmLeaveDialog() {
      if (this.checkForChanges()) {
        window.addEventListener("beforeunload", this.beforeWindowUnload);
      } else {
        window.removeEventListener("beforeunload", this.beforeWindowUnload);
      }
    },
    ...mapState(["editorIri", "editorSavedEntity", "filterOptions", "editorInvalidEntity", "editorValidity"])
  },
  data() {
    return {
      conceptOriginal: {} as any,
      conceptUpdated: {} as any,
      active: 0,
      loading: true,
      entityName: "",
      showJson: false
    };
  },
  async mounted() {
    this.loading = true;
    await this.fetchConceptData();
    await this.getFilterOptions();
    this.loading = false;
    await this.$nextTick();
  },
  methods: {
    async fetchConceptData(): Promise<void> {
      if (this.editorIri) {
        const fullEntity = await EntityService.getFullEntity(this.editorIri);
        if (fullEntity) {
          this.conceptOriginal = fullEntity;
          this.entityName = this.conceptOriginal[RDFS.LABEL];
          if (isObjectHasKeys(this.editorSavedEntity, ["@id"]) && this.editorSavedEntity["@id"] === this.editorIri) {
            this.conceptUpdated = this.editorSavedEntity;
          } else {
            this.conceptUpdated = JSON.parse(JSON.stringify(fullEntity));
          }
        }
      }
    },

    async getFilterOptions(): Promise<void> {
      if (!(isObjectHasKeys(this.filterOptions) && isArrayHasLength(this.filterOptions.schemes))) {
        const schemeOptions = await EntityService.getNamespaces();
        const typeOptions = await EntityService.getEntityChildren(IM.MODELLING_ENTITY_TYPE);
        const statusOptions = await EntityService.getEntityChildren(IM.STATUS);

        this.$store.commit("updateFilterOptions", {
          status: statusOptions,
          schemes: schemeOptions,
          types: typeOptions
        });
      }
    },

    confirmLeavePage() {
      if (this.checkForChanges()) {
        this.$confirm.require({
          message: "All unsaved changes will be lost. Are you sure you want to proceed?",
          header: "Confirmation",
          icon: "pi pi-exclamation-triangle",
          accept: () => {
            return true;
          },
          reject: () => {
            return false;
          }
        });
      } else {
        return true;
      }
    },

    beforeWindowUnload(e: any) {
      if (this.checkForChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    },

    async submit(): Promise<void> {
      if (await this.isValidEntity(this.conceptUpdated)) {
        console.log("submit");
        await this.$swal
          .fire({
            icon: "info",
            title: "Confirm save",
            text: "Are you sure you want to save your changes?",
            showCancelButton: true,
            confirmButtonText: "Save",
            reverseButtons: true,
            confirmButtonColor: "#2196F3",
            cancelButtonColor: "#607D8B"
          })
          .then(async (result: any) => {
            if (result.isConfirmed) {
              const result = await EntityService.updateEntity(this.conceptUpdated);
              console.log(result);
            }
          });
      } else {
        console.log("invalid entity");
        this.$swal.fire({
          icon: "warning",
          title: "Warning",
          text: "Invalid values found. Please review your entries.",
          confirmButtonText: "Close",
          confirmButtonColor: "#689F38"
        });
      }
    },

    async isValidEntity(entity: any): Promise<boolean> {
      if (!isObjectHasKeys(entity)) {
        this.$store.commit("updateEditorValidity", []);
        this.$store.commit("updateEditorInvalidEntity", true);
        return false;
      }
      const editorValidity = [] as { key: string; valid: boolean }[];
      editorValidity.push({ key: "iri", valid: hasValidIri(entity) });
      if (hasValidIri(entity)) editorValidity.push({ key: "iriExists", valid: await EntityService.iriExists(entity["@id"]) });
      editorValidity.push({ key: "name", valid: hasValidName(entity) });
      editorValidity.push({ key: "types", valid: hasValidTypes(entity) });
      editorValidity.push({ key: "status", valid: hasValidStatus(entity) });
      editorValidity.push({ key: "parents", valid: hasValidParents(entity) });
      this.$store.commit("updateEditorValidity", editorValidity);
      const valid = editorValidity.every(item => item.valid === true);
      this.$store.commit("updateEditorInvalidEntity", !valid);
      return valid;
    },

    updateConcept(data: any) {
      if (isArrayHasLength(data)) {
        data.forEach((item: any) => {
          if (isObjectHasKeys(item)) {
            for (const [key, value] of Object.entries(item)) {
              this.conceptUpdated[key] = value;
            }
          }
        });
      } else if (isObjectHasKeys(data)) {
        for (const [key, value] of Object.entries(data)) {
          this.conceptUpdated[key] = value;
        }
      }
      if (this.editorInvalidEntity) {
        this.isValidEntity(this.conceptUpdated);
      }
    },

    checkForChanges() {
      if (JSON.stringify(this.conceptUpdated) === JSON.stringify(this.conceptOriginal)) {
        return false;
      } else {
        return true;
      }
    },

    refreshEditor(): void {
      this.$swal
        .fire({
          icon: "warning",
          title: "Warning",
          text: "This action will reset all progress. Are you sure you want to proceed?",
          showCancelButton: true,
          confirmButtonText: "Reset",
          reverseButtons: true,
          confirmButtonColor: "#FBC02D",
          cancelButtonColor: "#607D8B",
          customClass: { confirmButton: "swal-reset-button" }
        })
        .then((result: any) => {
          if (result.isConfirmed) {
            this.conceptUpdated = { ...this.conceptOriginal };
          }
        });
    },

    isObjectHasKeysWrapper(object: any): boolean {
      return isObjectHasKeys(object);
    },

    handleClick(data: any) {
      console.log("click");
      console.log(data);
    }
  }
});
</script>

<style scoped>
#topbar-editor-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

#editor-main-container {
  width: 100%;
  height: calc(100% - 3.5rem);
  overflow: auto;
  background-color: #ffffff;
}

.content-buttons-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: auto;
}

.loading-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}

.content-json-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
}

.json-container {
  width: 50vw;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.content {
  flex: 1 1 auto;
  height: 100%;
  overflow: auto;
}

.json {
  flex: 0 1 auto;
  width: 100%;
  overflow: auto;
  border: 1px #dee2e6 solid;
  border-radius: 3px;
}

.json-header-container {
  padding: 0.5rem;
  height: 3rem;
  flex: 0 0 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.json-header {
  font-size: 1.5rem;
}

.json:deep(.vjs-value__string) {
  word-break: break-all;
}

.placeholder {
  height: 100%;
}

.tabview {
  display: flex;
  flex-flow: column;
  height: 100%;
}

.tabview:deep(.p-tabview-panels) {
  flex: 1 1 auto;
  padding: 0rem 0 0 0rem;
  overflow: auto;
}

.tabview:deep(.p-tabview-panel) {
  height: 100%;
  width: 100%;
}

.panel-content {
  height: 100%;
  width: 100%;
  overflow: auto;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
}

#editor-button-bar {
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

.topbar-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.entity-name {
  margin-left: 0.5rem;
  font-size: 1.5rem;
  overflow: hidden;
  height: 1.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 0 1 auto;
}

.p-divider {
  height: calc(100% - 2rem) !important;
  min-height: unset !important;
  align-self: center;
}

.json-toggle {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>
