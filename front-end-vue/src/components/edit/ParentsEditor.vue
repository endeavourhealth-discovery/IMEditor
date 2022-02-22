<template>
  <div class="loading-container p-d-flex p-flex-row p-jc-center p-ai-center" v-if="loading">
    <ProgressSpinner />
  </div>
  <div v-else class="parents-editor">
    <div class="editor-container">
      <Builder :parents="parents" @concept-updated="builderUpdated" />
    </div>
  </div>
</template>

<script lang="ts">
import { isObjectHasKeys } from "@/helpers/DataTypeCheckers";
import { defineComponent } from "@vue/runtime-core";
import Builder from "@/components/edit/parentsEditor/Builder.vue";
import { Vocabulary } from "im-library";

export default defineComponent({
  name: "ParentsEditor",
  props: { updatedConcept: { type: Object, required: true } },
  components: { Builder },
  emits: { "concept-updated": (payload: any) => true },
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
      if (isObjectHasKeys(this.updatedConcept, [Vocabulary.IM.IS_CONTAINED_IN]))
        this.parents[Vocabulary.IM.IS_CONTAINED_IN] = this.updatedConcept[Vocabulary.IM.IS_CONTAINED_IN];
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
}

.editor-container {
  flex-grow: 100;
}
</style>
