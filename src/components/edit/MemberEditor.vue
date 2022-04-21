<template>
  <div class="loading-container flex flex-row justify-content-center align-items-center" v-if="loading">
    <ProgressSpinner />
  </div>
  <div v-else class="member-editor">
    <div class="options-buttons-container">
      <SelectButton v-model="editorType" :options="editorOptions" />
    </div>
    <div class="editor-container">
      <Builder v-if="editorType === 'Builder'" :members="members" @concept-updated="builderUpdated" />
      <EclInput v-if="editorType === 'Ecl'" @concept-updated="eclMembersUpdated" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Builder from "@/components/edit/memberEditor/Builder.vue";
import EclInput from "@/components/edit/memberEditor/EclInput.vue";
import { Helpers, Vocabulary } from "im-library";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { IM } = Vocabulary;

export default defineComponent({
  name: "MemberEditor",
  props: { updatedConcept: { type: Object, required: true } },
  components: { Builder, EclInput },
  emits: { "concept-updated": (payload: any) => true },
  watch: {
    updatedMembers: {
      handler() {
        this.processMembers();
      },
      deep: true
    }
  },
  mounted() {
    this.processMembers();
  },
  data() {
    return {
      members: {} as any,
      loading: true,
      ecl: {} as any,
      editorType: "Builder",
      editorOptions: ["Builder", "Ecl"]
    };
  },
  methods: {
    processMembers(): void {
      this.loading = true;
      if (isObjectHasKeys(this.updatedConcept, [IM.DEFINITION]) && isArrayHasLength(this.updatedConcept[IM.DEFINITION])) {
        this.members[IM.DEFINITION] = JSON.parse(JSON.stringify(this.updatedConcept[IM.DEFINITION]));
      }
      if (isObjectHasKeys(this.updatedConcept, [IM.HAS_MEMBERS]) && isArrayHasLength(this.updatedConcept[IM.HAS_MEMBERS])) {
        this.members[IM.HAS_MEMBERS] = JSON.parse(JSON.stringify(this.updatedConcept[IM.HAS_MEMBERS]));
      }

      this.loading = false;
    },

    builderUpdated(data: any) {
      this.$emit("concept-updated", data);
    },

    eclMembersUpdated(data: any) {
      this.$emit("concept-updated", data);
    }
  }
});
</script>

<style scoped>
.member-name {
  word-wrap: break-word;
}

.loading-container {
  height: 100%;
}

.member-editor {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.editor-container {
  flex: 1 1 auto;
  overflow: auto;
}

.options-buttons-container {
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  margin-bottom: 1.5rem;
  margin-top: 0.5rem;
}
</style>
