<template>
  <div class="parent-header-container">
    <div class="title-buttons-container">
      <div class="title-container">
        <h4 class="title">
          <span :style="getColour(concept)" class="p-mx-1 type-icon" :key="concept['@id']">
            <i :class="getIcon(concept)" aria-hidden="true" />
          </span>
          {{ concept["http://www.w3.org/2000/01/rdf-schema#label"] || "Select a task or an action" }}
        </h4>
      </div>
      <div class="concept-buttons-container">
        <Button
          icon="pi pi-fw pi-eye"
          class="p-button-secondary p-button-outlined concept-button"
          @click="view(concept['@id'])"
          v-tooltip.left="'Open in Viewer'"
        />
        <Button
          icon="pi pi-fw pi-info-circle"
          class="p-button-secondary p-button-outlined concept-button"
          @click="showInfo(concept['@id'])"
          v-tooltip.left="'Show summary panel'"
        />
        <Button
          icon="pi pi-fw pi-pencil"
          class="p-button-secondary p-button-outlined concept-button"
          @click="edit(concept['@id'])"
          v-tooltip.left="'Edit'"
        />
        <!-- <Button
          icon="pi pi-fw pi-play"
          class="p-button-secondary p-button-outlined concept-button"
          @click="starTask(concept['@id'])"
          v-tooltip.left="'Start task'"
        /> -->
      </div>
    </div>
    <TextWithLabel label="Iri" :data="concept['@id']" :show="true" />
    <TextWithLabel label="Code" :data="concept['http://endhealth.info/im#code']" :show="true" />
    <div class="flex flex-row justify-content-start">
      <ArrayObjectNameTagWithLabel label="Status" :data="concept['http://endhealth.info/im#status']" :show="true" />
      <ArrayObjectNamesToStringWithLabel label="Types" :data="concept['http://www.w3.org/1999/02/22-rdf-syntax-ns#type']" :show="true" />
    </div>

    <TextHTMLWithLabel label="Description" :data="concept['http://www.w3.org/2000/01/rdf-schema#comment']" :show="true" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Helpers, Vocabulary } from "im-library";
import DirectService from "@/services/DirectService";
const { IM, RDF } = Vocabulary;
const {
  ConceptTypeMethods: { getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isArrayHasLength }
} = Helpers;

export default defineComponent({
  name: "ParentHeader",
  emits: { showDetails: (_payload: string) => true },
  props: { conceptIri: { type: String, required: true } },
  watch: {
    async conceptIri() {
      if (this.conceptIri) await this.getConcept();
    }
  },
  data() {
    return {
      concept: {} as any
    };
  },
  async mounted() {
    if (this.conceptIri) await this.getConcept();
  },
  methods: {
    async getConcept() {
      this.concept = await this.$entityService.getPartialEntity(this.conceptIri, []);
    },
    getIcon(concept: any) {
      if (concept["@id"] === IM.NAMESPACE + "Favourites") return ["fa-solid", "star"];
      return getFAIconFromType(concept[RDF.TYPE]);
    },

    getColour(concept: any) {
      return "color: " + getColourFromType(concept[RDF.TYPE]);
    },

    showInfo(iri: string) {
      this.$emit("showDetails", iri);
    },

    view(iri: string) {
      DirectService.directTo(this.$env.VIEWER_URL, iri, this, "concept");
    },

    edit(iri: string) {
      this.$router.push({ name: "TaskDefinition", params: { taskIri: iri } });
    },

    starTask(iri: string) {
      this.$router.push({ name: "EntityMapper", params: { taskIri: iri } });
    },

    updateFavourites(iri: string) {
      this.$store.commit("updateFavourites", iri);
    }
  }
});
</script>

<style scoped>
.parent-header-container {
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  padding: 0.5rem;
  gap: 0.5rem;
}

.title-container {
  display: flex;
  flex-flow: column;
  justify-content: center;
}

.title-buttons-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  width: 100%;
}

.title {
  padding: 0;
  margin: 0;
}

.type-icon {
  padding-right: 0.5rem;
}

.concept-buttons-container {
  display: flex;
  flex-flow: row;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
}

.concept-button,
.concept-button-fav {
  height: fit-content;
}

.concept-button:hover {
  background-color: #6c757d !important;
  color: #ffffff !important;
}

.concept-button-fav:hover {
  background-color: #e39a36 !important;
  color: #ffffff !important;
}
</style>
