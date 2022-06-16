<template>
  <div id="topbar-mapper-container">
    <TopBar>
      <template #content>
        <span class="title"><strong>IM Mapper</strong></span>
      </template>
    </TopBar>

    <div :class="showInfo ? 'main-container' : ''">
      <div :class="showInfo ? 'main-view' : ''">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" @showDetails="showSelectedDetails" @hideDetails="hideDetails" @updateSelected="updateSelected" />
          </keep-alive>
        </router-view>
      </div>

      <div v-if="showInfo" class="details-view">
        <InfoSideBar :selectedConceptIri="selectedConceptIri" @closeBar="hideDetails" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import InfoSideBar from "@/components/mapper/infobar/InfoSideBar.vue";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { IM, RDF, RDFS } = Vocabulary;

export default defineComponent({
  name: "MapperWizard",
  components: {
    InfoSideBar
  },
  data() {
    return {
      showInfo: false,
      selectedConceptIri: "",
      items: [
        {
          label: "Select task",
          to: "/task/view"
        },
        {
          label: "Define task",
          to: "/task/definition"
        },

        {
          label: "Mappper",
          to: "/task/mapper"
        }
      ],
      stepsObject: {} as any
    };
  },
  methods: {
    updateSelected(selectedIri: string) {
      this.selectedConceptIri = selectedIri;
    },

    showSelectedDetails(selectedIri: string) {
      console.log(selectedIri);
      this.selectedConceptIri = selectedIri;
      this.showInfo = true;
    },
    hideDetails() {
      this.showInfo = false;
    }
  }
});
</script>

<style scoped lang="scss">
#topbar-mapper-container {
  height: 100vh;
  width: 100vw;
  overflow: auto;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
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
  background-color: #ffffff;
}

.p-steps {
  width: 100%;
}

.main-container {
  display: flex;
}

.main-view {
  flex: 75%;
}

.details-view {
  flex: 25%;
}
</style>
