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
      <div v-else class="content-container">
        <Steps :model="stepsItems" />
        <router-view v-slot="{ Component }" :formData="formObject" @prevPage="prevPage($event)" @nextPage="nextPage($event)" @complete="submit">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import { mapState } from "vuex";
import { Helpers, Vocabulary } from "im-library";
import EntityService from "@/services/EntityService";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { IM } = Vocabulary;

export default defineComponent({
  name: "Creator",
  beforeRouteLeave() {
    this.confirmLeavePage();
  },
  beforeUnmount() {
    window.removeEventListener("beforeunload", this.beforeWindowUnload);
  },
  computed: {
    toggleConfirmLeaveDialog() {
      if (this.checkForChanges()) {
        window.addEventListener("beforeunload", this.beforeWindowUnload);
      } else {
        window.removeEventListener("beforeunload", this.beforeWindowUnload);
      }
    },
    ...mapState(["currentUser", "isLoggedIn", "filterOptions"])
  },
  async mounted() {
    this.loading = true;
    await this.getFilterOptions();
    this.loading = false;
  },
  data() {
    return {
      conceptOriginal: {} as any,
      conceptUpdated: {} as any,
      loading: true,
      formObject: {} as any,
      stepsItems: [
        {
          label: "Type",
          to: "/type"
        }
      ]
    };
  },
  methods: {
    async getFilterOptions(): Promise<void> {
      if (!isObjectHasKeys(this.filterOptions) && isArrayHasLength(this.filterOptions.schemes)) {
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

    checkForChanges() {
      if (JSON.stringify(this.conceptUpdated) === JSON.stringify(this.conceptOriginal)) {
        return false;
      } else {
        return true;
      }
    },

    submit(): void {
      console.log("submit");
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
</style>
