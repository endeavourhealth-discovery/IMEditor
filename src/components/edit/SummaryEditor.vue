<template>
  <div class="loading-container flex flex-row justify-content-center align-items-center" v-if="loading">
    <ProgressSpinner />
  </div>
  <div v-else class="p-fluid editor-grid">
    <div class="field float-label-container iri">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg" v-model="updateIri" type="text" @input="updateEntity({ '@id': iri })" disabled />
        <label for="Iri">Iri</label>
      </span>
    </div>
    <div class="field float-label-container name">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg" v-model="name" type="text" @input="updateEntity({ 'http://www.w3.org/2000/01/rdf-schema#label': name })" />
        <label for="Name">Name</label>
      </span>
    </div>
    <div class="field float-label-container code">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg" v-model="code" type="text" @input="updateEntity({ '@id': updateIri, 'http://endhealth.info/im#code': code })" />
        <label for="Code">Code</label>
      </span>
    </div>
    <div class="field float-label-container description">
      <span class="p-float-label">
        <Textarea
          class="p-inputtext-lg"
          v-model="description"
          rows="4"
          @input="updateEntity({ 'http://www.w3.org/2000/01/rdf-schema#comment': description })"
        />
        <label for="address">Description</label>
      </span>
    </div>
    <div class="field float-label-container version">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg" v-model="version" type="text" @input="updateEntity" disabled />
        <label for="Version">Version</label>
      </span>
    </div>
    <div class="field float-label-container status">
      <span class="p-float-label">
        <Dropdown
          class="p-inputtext-lg"
          v-model="status"
          :options="filterOptions.status"
          optionLabel="name"
          @change="updateEntity({ 'http://endhealth.info/im#status': [status] })"
        />
        <label>Status</label>
      </span>
    </div>
    <div class="field float-label-container scheme">
      <span class="p-float-label">
        <Dropdown class="p-inputtext-lg" v-model="scheme" :options="filterOptions.schemes" optionLabel="name" @change="updateEntity({ '@id': updateIri })" />
        <label>Scheme</label>
      </span>
    </div>
    <div class="field float-label-container type">
      <span class="p-float-label">
        <MultiSelect
          class="p-inputtext-lg"
          v-model="types"
          :options="filterOptions.types"
          optionLabel="name"
          @change="updateEntity({ 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': types })"
        />
        <label>Types</label>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import EntityService from "@/services/EntityService";
import { defineComponent } from "@vue/runtime-core";
import { mapState } from "vuex";
import { Vocabulary, Helpers } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { IM, RDF, RDFS } = Vocabulary;

export default defineComponent({
  name: "SummaryEditor",
  props: { updatedConcept: { type: Object, required: true } },
  emits: { "concept-updated": (payload: any) => isObjectHasKeys(payload) },
  watch: {
    updatedConcept: {
      handler() {
        this.processEntity();
      },
      deep: true
    }
  },
  computed: {
    ...mapState(["filterOptions"]),
    updateIri() {
      return this.scheme.iri + this.code;
    }
  },
  data() {
    return {
      iri: "",
      name: "",
      code: "",
      scheme: {} as any,
      status: {} as any,
      types: [] as any[],
      version: "",
      description: "",
      loading: false
    };
  },
  async mounted() {
    this.loading = true;
    await this.getFilterOptions();
    this.processEntity();
    this.loading = false;
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

    processEntity() {
      if (!this.updatedConcept) return;
      if (isObjectHasKeys(this.updatedConcept, ["@id"])) this.iri = this.updatedConcept["@id"];
      if (isObjectHasKeys(this.updatedConcept, [RDFS.LABEL])) this.name = this.updatedConcept[RDFS.LABEL];
      if (isObjectHasKeys(this.updatedConcept, [IM.HAS_STATUS])) {
        const found = this.filterOptions.status.find((item: any) => item["@id"] === this.updatedConcept[IM.HAS_STATUS][0]["@id"]);
        this.status = found ? found : "";
      }
      if (isObjectHasKeys(this.updatedConcept, [RDF.TYPE])) {
        this.updatedConcept[RDF.TYPE].forEach((type: any) => {
          const found = this.filterOptions.types.find((option: any) => option["@id"] === type["@id"]);
          if (found && !this.types.includes(found)) this.types.push(found);
        });
      }
      const found = this.filterOptions.schemes.find((scheme: any) => scheme.iri === this.iri.substring(0, this.iri.indexOf("#") + 1));
      this.scheme = found ? found : "";
      this.code = this.iri.substring(this.iri.indexOf("#") + 1);
      if (isObjectHasKeys(this.updatedConcept, [RDFS.COMMENT])) this.description = this.updatedConcept[RDFS.COMMENT];
    },

    updateEntity(data: any) {
      this.$emit("concept-updated", data);
    }
  }
});
</script>

<style scoped>
.save-button {
  margin-left: 0.5em;
}

.p-tabview {
  padding-top: 3px;
}

.p-card {
  box-shadow: unset;
  height: 100%;
}

.loading-container {
  height: 100%;
  width: 100%;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: auto;
  grid-template-areas:
    "iri name code"
    "description description description"
    "version status scheme"
    "imlang imlang imlang";
  column-gap: 7px;
  height: 100%;
  align-content: start;
}

.iri {
  grid-area: iri;
}

.name {
  grid-area: name;
}

.code {
  grid-area: code;
}

.description {
  grid-area: description;
}

.version {
  grid-area: version;
}

.status {
  grid-area: status;
}

.scheme {
  grid-area: scheme;
}

.imlang-container {
  grid-area: imlang;
}

.field {
  height: fit-content;
}

.float-label-container {
  margin-top: 1.5rem;
}
</style>
