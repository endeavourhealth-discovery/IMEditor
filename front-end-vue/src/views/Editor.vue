<template>
  <div id="topbar-editor-container">
    <TopBar />
    <ConfirmDialog></ConfirmDialog>
    <div id="editor-main-container">
      <div class="loading-container p-d-flex p-flex-row p-jc-center p-ai-center" v-if="loading">
        <ProgressSpinner />
      </div>
      <div v-else class="panel-buttons-container">
        <Panel :header="'Editor: ' + editorIri">
          <div class="content-json-container">
            <div class="content">
              <TabView v-model:activeIndex="active">
                <TabPanel header="Summary">
                  <div class="panel-content" id="summary-editor-container" :style="contentHeight">
                    <SummaryEditor
                      v-if="active === 0 && isObjectHasKeysWrapper(conceptUpdated)"
                      :updatedConcept="conceptUpdated"
                      @concept-updated="updateConcept"
                    />
                  </div>
                </TabPanel>
                <TabPanel header="Parents">
                  <div class="panel-content" id="parents-editor-container" :style="contentHeight">
                    <ParentsEditor
                      v-if="active === 1 && isObjectHasKeysWrapper(conceptUpdated)"
                      :updatedConcept="conceptUpdated"
                      @concept-updated="updateConcept"
                    />
                  </div>
                </TabPanel>
                <TabPanel v-if="isValueSet" header="Members">
                  <div class="panel-content" id="member-editor-container" :style="contentHeight">
                    <MemberEditor
                      v-if="active === 2"
                      :updatedMembers="conceptUpdated['http://endhealth.info/im#definition'] ? conceptUpdated['http://endhealth.info/im#definition'] : {}"
                      @concept-updated="updateConcept"
                    />
                  </div>
                </TabPanel>
              </TabView>
            </div>
            <div v-if="contentHeight" class="json-container" :style="contentHeight">
              <span>JSON viewer</span>
              <VueJsonPretty v-if="isObjectHasKeysWrapper(conceptUpdated)" class="json" :path="'res'" :data="conceptUpdated" @click="handleClick" />
            </div>
          </div>
        </Panel>
        <div class="button-bar p-d-flex p-flex-row p-jc-end" id="editor-button-bar">
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
import { isValueSet } from "@/helpers/ConceptTypeMethods";
import { RDF } from "@/vocabulary/RDF";
import { isObjectHasKeys } from "@/helpers/DataTypeCheckers";
import { getContainerElementOptimalHeight } from "@/helpers/GetContainerElementOptimalHeight";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import TopBar from "@/components/TopBar.vue";
import { mapState } from "vuex";

export default defineComponent({
  name: "Editor",
  components: {
    ConfirmDialog,
    SummaryEditor,
    MemberEditor,
    VueJsonPretty,
    ParentsEditor,
    TopBar
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
    ...mapState(["editorIri", "editorSavedEntity"])
  },
  data() {
    return {
      conceptOriginal: {} as any,
      conceptUpdated: {} as any,
      active: 0,
      contentHeight: "",
      loading: true
    };
  },
  async mounted() {
    this.loading = true;
    window.addEventListener("resize", this.onResize);
    await this.fetchConceptData();
    this.loading = false;
    await this.$nextTick();
    this.onResize();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },
  methods: {
    onResize(): void {
      this.setContentHeight();
    },

    async fetchConceptData(): Promise<void> {
      if (this.editorIri) {
        const fullEntity = await EntityService.getFullEntity(this.editorIri);
        if (fullEntity) {
          this.conceptOriginal = fullEntity;
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

    setContentHeight(): void {
      this.contentHeight =
        "height: " + getContainerElementOptimalHeight("editor-main-container", ["p-panel-header", "p-tabview-nav", "button-bar"], true, 4, 4) + ";";
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
  height: 100vh;
  width: 100vw;
  overflow: auto;
}

#editor-main-container {
  width: 100%;
  height: calc(100% - 93.81px - 1rem);
  overflow-y: auto;
}

.panel-buttons-container {
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
  height: calc(100% - 1rem);
  width: 100%;
  overflow: auto;
  border: 1px #dee2e6 solid;
  border-radius: 3px;
}

.placeholder {
  height: 100%;
}

.panel-content {
  overflow-y: auto;
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
</style>
