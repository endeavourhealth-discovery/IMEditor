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
        <div class="steps-json-container">
          <div class="steps-content">
            <Steps :model="stepsItems" />
            <router-view v-slot="{ Component }">
              <keep-alive>
                <component :is="Component" :updatedConcept="conceptUpdated" @concept-updated="updateConcept" mode="create" />
              </keep-alive>
            </router-view>
          </div>
          <Divider v-if="showJson" layout="vertical" />
          <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>
            <VueJsonPretty class="json" :path="'res'" :data="conceptUpdated" @click="handleClick" />
          </div>
          <Button
            class="p-button-rounded p-button-info p-button-outlined json-toggle"
            :label="showJson ? 'hide JSON' : 'show JSON'"
            @click="showJson = !showJson"
          />
        </div>
        <div class="button-bar" id="creator-button-bar">
          <Button v-if="currentStep > 0" icon="pi pi-angle-left" label="Back" @click="stepsBack" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="refreshCreator" />
          <Button icon="pi pi-check" label="Create" class="p-button-success save-button" @click="submit" />
          <Button v-if="currentStep < stepsItems.length - 1" icon="pi pi-angle-right" label="Next" @click="stepsForward" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import { mapState } from "vuex";
import { Helpers, Vocabulary, Env } from "im-library";
import EntityService from "@/services/EntityService";
import TypeSelector from "@/components/creator/TypeSelector.vue";
import VueJsonPretty from "vue-json-pretty";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  ConceptTypeMethods: { isValueSet },
  EntityValidator: { hasValidIri, hasValidName, hasValidParents, hasValidTypes, hasValidStatus },
  Converters: { iriToUrl }
} = Helpers;
const { IM, RDF, RDFS } = Vocabulary;

export default defineComponent({
  name: "Creator",
  components: { TypeSelector, VueJsonPretty },
  beforeRouteLeave() {
    this.confirmLeavePage();
  },
  beforeUnmount() {
    window.removeEventListener("beforeunload", this.beforeWindowUnload);
  },
  watch: {
    conceptUpdated: {
      async handler(newValue) {
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
    ...mapState(["currentUser", "isLoggedIn", "filterOptions", "creatorInvalidEntity"])
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
      currentStep: 0,
      showJson: false
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

      if (this.creatorInvalidEntity) {
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

    async submit(): Promise<void> {
      if (await this.isValidEntity(this.conceptUpdated)) {
        console.log("submit");
        await this.$swal
          .fire({
            icon: "info",
            title: "Confirm create",
            text: "Are you sure you want to create this entity?",
            showCancelButton: true,
            confirmButtonText: "Create",
            reverseButtons: true,
            confirmButtonColor: "#689F38",
            cancelButtonColor: "#607D8B",
            showLoaderOnConfirm: true,
            allowOutsideClick: () => !this.$swal.isLoading(),
            preConfirm: async () => {
              const res = await EntityService.createEntity(this.conceptUpdated);
              if (res) return res;
              else this.$swal.showValidationMessage("Error creating entity from server.");
            }
          })
          .then((result: any) => {
            if (result.isConfirmed) {
              this.$swal
                .fire({
                  title: "Success",
                  text: "Entity" + this.conceptUpdated["@id"] + " has been created.",
                  icon: "success",
                  showCancelButton: true,
                  reverseButtons: true,
                  confirmButtonText: "Open in Viewer",
                  confirmButtonColor: "#2196F3",
                  cancelButtonColor: "#607D8B"
                })
                .then((result: any) => {
                  if (result.isConfirmed) {
                    window.location.href = Env.viewerUrl + "concept?selectedIri=" + iriToUrl(this.conceptUpdated["@id"]);
                  } else {
                    this.$router.push({ name: "Editor", params: { selectedIri: this.conceptUpdated["@id"] } });
                  }
                });
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
        this.$store.commit("updateCreatorValidity", []);
        this.$store.commit("updateCreatorInvalidEntity", true);
        return false;
      }
      const creatorValidity = [] as { key: string; valid: boolean }[];
      creatorValidity.push({ key: "iri", valid: hasValidIri(entity) });
      if (hasValidIri(entity)) creatorValidity.push({ key: "iriExists", valid: !(await EntityService.iriExists(entity["@id"])) });
      creatorValidity.push({ key: "name", valid: hasValidName(entity) });
      creatorValidity.push({ key: "types", valid: hasValidTypes(entity) });
      creatorValidity.push({ key: "status", valid: hasValidStatus(entity) });
      creatorValidity.push({ key: "parents", valid: hasValidParents(entity) });
      this.$store.commit("updateCreatorValidity", creatorValidity);
      const valid = creatorValidity.every(item => item.valid === true);
      this.$store.commit("updateCreatorInvalidEntity", !valid);
      return valid;
    },

    refreshCreator() {
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
    },

    handleClick(data: any) {
      console.log("click");
      console.log(data);
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

.steps-json-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
}

.steps-content {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
}

.p-steps {
  width: 90%;
}

.json-container {
  width: 50vw;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
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

.json:deep(.vjs-value) {
  font-size: 1rem;
}

.json:deep(.vjs-key) {
  font-size: 1rem;
}

.json-toggle {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: #ffffff !important;
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
