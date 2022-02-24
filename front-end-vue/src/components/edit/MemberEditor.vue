<template>
  <div class="loading-container flex flex-row justify-content-center align-items-center" v-if="loading">
    <ProgressSpinner />
  </div>
  <div v-else class="member-editor">
    <div class="options-buttons-container">
      <SelectButton v-model="editorType" :options="editorOptions" />
    </div>
    <div class="editor-container">
      <Builder v-if="editorType === 'Builder'" :included="included" @concept-updated="builderUpdated" />
      <EclInput v-if="editorType === 'Ecl'" @concept-updated="eclMembersUpdated" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Builder from "@/components/edit/memberEditor/Builder.vue";
import EclInput from "@/components/edit/memberEditor/EclInput.vue";
import { Helpers } from "im-library";
const {
  DataTypeCheckers: { isArrayHasLength }
} = Helpers;

export default defineComponent({
  name: "MemberEditor",
  props: { updatedMembers: { type: Object, required: true } },
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
      included: [] as any[],
      loading: true,
      ecl: {} as any,
      editorType: "Builder",
      editorOptions: ["Builder", "Ecl"]
    };
  },
  methods: {
    processMembers(): void {
      this.loading = true;
      if (isArrayHasLength(this.updatedMembers)) {
        this.included = JSON.parse(JSON.stringify(this.updatedMembers));
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
  flex-grow: 100;
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
