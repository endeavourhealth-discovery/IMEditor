<template>
  <div class="loading-container flex flex-row justify-content-center align-items-center" v-if="loading">
    <ProgressSpinner />
  </div>
  <div v-else class="summary-container">
    <div class="float-label-container iri-validate-container">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg input-text" :class="invalidIri && 'invalid'" v-model="iri" type="text" disabled />
        <label for="Iri">Iri</label>
      </span>
      <small v-if="invalidIri" class="validate-error">Iri already exists.</small>
      <small v-if="!iri.length && !code.length && !scheme.iri" class="validate-error">Code and scheme required for iri.</small>
      <small v-else-if="!iri.length && !code.length" class="validate-error">Code required for iri.</small>
      <small v-else-if="!iri.length && !scheme.iri" class="validate-error">Scheme required for iri.</small>
    </div>
    <div class="float-label-container name">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg input-text" v-model="name" type="text" />
        <label for="Name">Name</label>
      </span>
    </div>
    <div class="float-label-container code">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg input-text" :class="invalidIri && 'invalid'" v-model="code" type="text" :disabled="mode !== 'create'" />
        <label for="Code">Code</label>
      </span>
    </div>
    <div class="float-label-container description">
      <span class="p-float-label">
        <Textarea class="p-inputtext-lg input-text description" v-model="description" rows="4" />
        <label for="address">Description</label>
      </span>
    </div>
    <div class="float-label-container version">
      <span class="p-float-label">
        <InputText class="p-inputtext-lg input-text" v-model="version" type="text" disabled />
        <label for="Version">Version</label>
      </span>
    </div>
    <div class="float-label-container status">
      <span class="p-float-label">
        <Dropdown class="p-inputtext-lg input-text" v-model="status" :options="filterOptions.status" optionLabel="name" />
        <label>Status</label>
      </span>
    </div>
    <div class="float-label-container scheme">
      <span class="p-float-label">
        <Dropdown
          class="p-inputtext-lg input-text scheme"
          :class="invalidIri && 'invalid'"
          v-model="scheme"
          :options="filterOptions.schemes"
          optionLabel="name"
          :disabled="mode !== 'create'"
        />
        <label>Scheme</label>
      </span>
    </div>
    <div class="float-label-container type">
      <span class="p-float-label">
        <MultiSelect class="p-inputtext-lg input-text" v-model="types" :options="filterOptions.types" optionLabel="name" />
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
  props: { updatedConcept: { type: Object, required: true }, mode: { type: String, required: true } },
  emits: { "concept-updated": (payload: any) => isObjectHasKeys(payload) },
  watch: {
    updatedConcept: {
      handler() {
        this.processEntity();
      },
      deep: true
    },
    name(newValue, oldValue) {
      this.updateEntity({ "http://www.w3.org/2000/01/rdf-schema#label": newValue });
    },
    async code(newValue, oldValue) {
      const newIri = await this.updateIri();
      if (newValue && newValue !== oldValue && newIri) this.updateEntity({ "@id": newIri, "http://endhealth.info/im#code": newValue });
      else if (newValue !== oldValue) this.updateEntity({ "http://endhealth.info/im#code": newValue });
    },
    description(newValue) {
      this.updateEntity({ "http://www.w3.org/2000/01/rdf-schema#comment": newValue });
    },
    status: {
      handler(newValue) {
        this.updateEntity({ "http://endhealth.info/im#status": [{ "@id": newValue["@id"], name: newValue.name }] });
      },
      deep: true
    },
    scheme: {
      async handler(newValue, oldValue) {
        if (newValue !== oldValue) this.updateEntity({ "@id": await this.updateIri() });
      },
      deep: true
    },
    types: {
      handler(newValue) {
        const filtered = newValue.map((type: any) => {
          return { "@id": type["@id"], name: type.name };
        });
        this.updateEntity({ "http://www.w3.org/1999/02/22-rdf-syntax-ns#type": filtered });
      },
      deep: true
    }
  },
  computed: {
    ...mapState(["filterOptions"])
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
      loading: false,
      invalidIri: false
    };
  },
  mounted() {
    this.loading = true;
    this.processEntity();
    this.loading = false;
  },
  methods: {
    processEntity() {
      if (!this.updatedConcept) return;
      if (isObjectHasKeys(this.updatedConcept, ["@id"])) {
        this.iri = this.updatedConcept["@id"];
        if (!isObjectHasKeys(this.updatedConcept, [IM.CODE])) this.code = this.iri.substring(this.iri.indexOf("#") + 1);
      }
      if (isObjectHasKeys(this.updatedConcept, [IM.CODE])) {
        this.code = this.updatedConcept[IM.CODE];
      }
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
      if (found) this.scheme = found;
      if (isObjectHasKeys(this.updatedConcept, [RDFS.COMMENT])) this.description = this.updatedConcept[RDFS.COMMENT];
    },

    updateEntity(data: any) {
      this.$emit("concept-updated", data);
    },

    async updateIri(): Promise<string> {
      await this.checkIriExists();
      return this.generateIri();
    },

    generateIri() {
      if (this.scheme && this.scheme.iri && this.code) {
        this.iri = this.scheme.iri + this.code;
        return this.scheme.iri + this.code;
      }
      this.iri = "";
      return "";
    },

    async checkIriExists() {
      if (this.scheme.iri && this.code && this.mode === "create") this.invalidIri = await EntityService.iriExists(this.scheme.iri + this.code);
      else this.invalidIri = false;
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

.summary-container {
  /* max-height: calc(100% - 1.5rem); */
  flex: 0 1 auto;
  overflow: auto;
  width: 100%;
  padding: 2.5rem 1rem 1rem 1rem;
  display: flex;
  flex-flow: row wrap;
  justify-content: flex-start;
  align-items: flex-start;
  column-gap: 0.5rem;
  row-gap: 1.5rem;
}

.float-label-container {
  /* margin-top: 1.5rem; */
  height: fit-content;
  max-width: 100%;
}

.description {
  width: 100%;
}

.input-text {
  max-width: 100%;
  min-width: 15rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.invalid {
  border-color: #e24c4c;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
}

.iri-validate-container {
  display: flex;
  flex-flow: column nowrap;
}
</style>
