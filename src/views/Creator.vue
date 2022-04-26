<template>
  <div id="topbar-creator-container">
    <TopBar>
      <template #content>
        <div class="topbar-content">
          <span class="title"><strong>IM Creator</strong></span>
        </div>
      </template>
    </TopBar>
    <ConfirmDialog />
    <div id="creator-main-container">
      <div class="loading-container" v-if="loading">
        <ProgressSpinner />
      </div>
      <div v-else class="content-buttons-container">
        <div class="steps-content">
          <Steps :model="stepsItems" />
          <router-view v-slot="{ Component }">
            <keep-alive>
              <component :is="Component" :updatedConcept="conceptUpdated" @concept-updated="updateConcept" />
            </keep-alive>
          </router-view>
        </div>
        <div class="button-bar" id="creator-button-bar">
          <Button icon="pi pi-angle-left" label="Back" @click="stepsBack" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="refreshCreator" />
          <Button icon="pi pi-check" label="Submit" class="p-button-success save-button" @click="submit" />
          <Button icon="pi pi-angle-right" label="Next" @click="stepsForward" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import { mapState } from "vuex";
import { Helpers, Vocabulary } from "im-library";
import EntityService from "@/services/EntityService";
import TypeSelector from "@/components/creator/TypeSelector.vue";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  ConceptTypeMethods: { isValueSet }
} = Helpers;
const { IM, RDF } = Vocabulary;

export default defineComponent({
  name: "Creator",
  components: { TypeSelector },
  beforeRouteLeave() {
    this.confirmLeavePage();
  },
  beforeUnmount() {
    window.removeEventListener("beforeunload", this.beforeWindowUnload);
  },
  watch: {
    conceptUpdated: {
      handler(newValue) {
        if (this.hasType) {
          this.setStepsFromType(newValue[RDF.TYPE]);
        }
      },
      deep: true
    }
  },
  computed: {
    toggleConfirmLeaveDialog() {
      if (this.checkForChanges()) {
        window.addEventListener("beforeunload", this.beforeWindowUnload);
      } else {
        window.removeEventListener("beforeunload", this.beforeWindowUnload);
      }
    },
    hasType() {
      if (isObjectHasKeys(this.conceptUpdated, [RDF.TYPE])) return true;
      else return false;
    },
    ...mapState(["currentUser", "isLoggedIn", "filterOptions"])
  },
  async mounted() {
    this.loading = true;
    await this.getFilterOptions();
    this.setStepsFromType(this.hasType ? this.conceptUpdated[RDF.TYPE] : []);
    this.loading = false;
  },
  data() {
    return {
      conceptOriginal: {} as any,
      conceptUpdated: {} as any,
      loading: true,
      formObject: {} as any,
      stepsItems: [] as { label: string; to: string }[],
      currentStep: 0
    };
  },
  methods: {
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

    updateConceptType(data: any) {
      this.updateConcept(data);
      this.$router.push(this.stepsItems[this.currentStep].to);
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
    },

    checkForChanges() {
      if (JSON.stringify(this.conceptUpdated) === JSON.stringify(this.conceptOriginal)) {
        return false;
      } else {
        return true;
      }
    },

    submit(): void {
      console.log("submit");
    },

    refreshCreator() {
      this.conceptUpdated = { ...this.conceptOriginal };
    },

    setStepsFromType(types: any[]) {
      if (isValueSet(types)) {
        if (this.stepsItems.findIndex(item => item.label === "Members") === -1) {
          this.stepsItems.push({
            label: "Members",
            to: "/creator/members"
          });
        }
      } else {
        this.stepsItems = [
          {
            label: "Type",
            to: "/creator/type"
          },
          {
            label: "Summary",
            to: "/creator/summary"
          },
          { label: "Parents", to: "/creator/parents" }
        ];
      }
      if (this.currentStep === 0) {
        this.currentStep++;
        this.$router.push(this.stepsItems[1].to);
      }
    },

    stepsBack() {
      this.currentStep--;
      if (this.currentStep >= 0) this.$router.push(this.stepsItems[this.currentStep].to);
    },

    stepsForward() {
      this.currentStep++;
      if (this.currentStep < this.stepsItems.length) this.$router.push(this.stepsItems[this.currentStep].to);
    }
  }
});
</script>

<style scoped>
#topbar-creator-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

#creator-main-container {
  height: calc(100% - 3.5rem);
  width: 100%;
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

.steps-content {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.topbar-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
}

.loading-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}

.p-steps {
  padding-top: 1rem;
}

.button-bar {
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
</style>
