<template>
  <div class="loading-container flex flex-row justify-content-center align-items-center" v-if="loading">
    <ProgressSpinner />
  </div>
  <div v-else class="parents-editor">
    <div class="editor-container">
      <Builder :parents="parents" @concept-updated="builderUpdated" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import Builder from "@/components/edit/parentsEditor/Builder.vue";
import { Vocabulary, Helpers } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { IM, RDFS, RDF } = Vocabulary;

export default defineComponent({
  name: "ParentsEditor",
  props: { updatedConcept: { type: Object, required: true }, mode: { type: String, required: true } },
  components: { Builder },
  provide() {
    return { entityType: this.updatedConcept[RDF.TYPE] };
  },
  emits: { "concept-updated": (_payload: any) => true },
  watch: {
    updatedConcept: {
      handler() {
        this.getParents();
      },
      deep: true
    }
  },
  mounted() {
    this.getParents();
  },
  data() {
    return {
      parents: {} as any,
      loading: true
    };
  },
  methods: {
    getParents() {
      this.loading = true;
      if (isObjectHasKeys(this.updatedConcept, [IM.IS_CONTAINED_IN])) this.parents[IM.IS_CONTAINED_IN] = this.updatedConcept[IM.IS_CONTAINED_IN];
      if (isObjectHasKeys(this.updatedConcept, [RDFS.SUBCLASS_OF])) this.parents[RDFS.SUBCLASS_OF] = this.updatedConcept[RDFS.SUBCLASS_OF];
      if (isObjectHasKeys(this.updatedConcept, [IM.IS_A])) this.parents[IM.IS_A] = this.updatedConcept[IM.IS_A];
      this.loading = false;
    },

    builderUpdated(data: any) {
      this.$emit("concept-updated", data);
    }
  }
});
</script>

<style scoped>
.loading-container {
  height: 100%;
}

.parents-editor {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  padding: 1rem 1rem 0 1rem;
}

.editor-container {
  flex: 1 1 auto;
  overflow: auto;
}
</style>
