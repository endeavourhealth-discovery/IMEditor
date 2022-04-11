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
      <div class="loading-container flex flex-row justify-content-center align-items-center" v-if="loading">
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
                  />
                </div>
              </TabPanel>
              <TabPanel header="Parents">
                <div class="panel-content" id="parents-editor-container">
                  <ParentsEditor
                    v-if="active === 1 && isObjectHasKeysWrapper(conceptUpdated)"
                    :updatedConcept="conceptUpdated"
                    @concept-updated="updateConcept"
                  />
                </div>
              </TabPanel>
              <TabPanel v-if="isValueSet" header="Members">
                <div class="panel-content" id="member-editor-container">
                  <MemberEditor
                    v-if="active === 2"
                    :updatedMembers="conceptUpdated['http://endhealth.info/im#definition'] ? conceptUpdated['http://endhealth.info/im#definition'] : {}"
                    @concept-updated="updateConcept"
                  />
                </div>
              </TabPanel>
            </TabView>
          </div>
          <div class="json-container">
            <span>JSON viewer</span>
            <VueJsonPretty v-if="isObjectHasKeysWrapper(conceptUpdated)" class="json" :path="'res'" :data="conceptUpdated" @click="handleClick" />
          </div>
        </div>
        <div class="button-bar flex flex-row justify-content-end" id="editor-button-bar">
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
  ContainerDimensionGetters: { getContainerElementOptimalHeight }
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
  beforeRouteLeave(to, from, next) {
    if (this.checkForChanges()) {
      this.$confirm.require({
        message: "All unsaved changes will be lost. Are you sure you want to proceed?",
        header: "Confirmation",
        icon: "pi pi-exclamation-triangle",
        accept: () => {
          next();
        }
      });
    } else {
      next();
    }
  },
  computed: {
    isValueSet(): any {
      return isValueSet(this.conceptUpdated[RDF.TYPE]);
    },
    ...mapState(["editorIri", "editorSavedEntity", "currentUser", "isLoggedIn"])
  },
  data() {
    return {
      conceptOriginal: {} as any,
      conceptUpdated: {} as any,
      active: 0,
      contentHeight: "",
      loading: true,
      entityName: ""
    };
  },
  async mounted() {
    this.loading = true;
    await this.fetchConceptData();
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

    submit(): void {
      console.log("submit");
    },

    updateConcept(data: any) {
      for (const [key, value] of Object.entries(data)) {
        this.conceptUpdated[key] = value;
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
      this.conceptUpdated = { ...this.conceptOriginal };
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
}

.content-json-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  gap: 1rem;
  overflow: auto;
}

.json-container {
  width: 50%;
  height: 100%;
  overflow: auto;
}

.content {
  width: 50%;
  height: 100%;
}

.json {
  height: calc(100% - 1rem);
  width: 100%;
  overflow: auto;
  border: 1px #dee2e6 solid;
  border-radius: 3px;
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
}

.tabview:deep(.p-tabview-panel) {
  height: 100%;
  width: 100%;
}

.panel-content {
  height: 100%;
  width: 100;
  overflow: auto;
}

/* .p-panel {
  display: flex;
  flex-flow: column nowrap;
  flex-grow: 100;
}

.p-panel .p-toggleable-content {
  flex-grow: 100;
}

.panel-content {
  overflow-y: auto;
} */

.title {
  font-size: 2rem;
  display: flex;
  flex-flow: row;
  align-items: center;
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
</style>
