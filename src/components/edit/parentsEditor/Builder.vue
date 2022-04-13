<template>
  <div id="parents-builder-container">
    <h3>Parents builder</h3>
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else id="parents-build">
      <template v-for="item of parentsBuild" :key="item.id">
        <component
          :is="item.type"
          :value="item.value"
          :id="item.id"
          :position="item.position"
          :last="parentsBuild.length - 2 <= item.position ? true : false"
          :builderType="item.builderType"
          @deleteClicked="deleteItem"
          @addClicked="addItem"
          @updateClicked="updateItem"
        >
        </component>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import Logic from "@/components/edit/parentsEditor/builder/Logic.vue";
import { Helpers, Enums } from "im-library";
import { NextComponentSummary, ComponentDetails, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { generateNewComponent, genNextOptions, addItem, addNextOptions, scrollIntoView, deleteItem, updateItem, updatePositions }
} = Helpers;
const { ComponentType, BuilderType } = Enums;

export default defineComponent({
  name: "Builder",
  props: { parents: { type: Object, required: true } },
  components: { AddDeleteButtons, Logic },
  emits: {
    "concept-updated": (payload: any) => true
  },
  watch: {
    parentsBuild: {
      handler() {
        this.onConfirm();
      },
      deep: true
    }
  },
  mounted() {
    this.createBuild();
  },
  data() {
    return {
      parentsBuild: [] as any[],
      parentsAsNode: {} as any,
      loading: true
    };
  },
  methods: {
    createBuild() {
      this.loading = true;
      this.parentsBuild = [];
      if (!isObjectHasKeys(this.parents)) {
        return;
      }
      let position = 0;
      for (const [key, value] of Object.entries(this.parents)) {
        this.parentsBuild.push(this.processObject({ key: key, value: value }, position));
        position++;
      }
      if (!isArrayHasLength(this.parentsBuild)) {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.parentsBuild.push(generateNewComponent(ComponentType.LOGIC, 0, undefined, BuilderType.PARENT));
    },

    generateParentsAsNode() {
      let json = [];
      if (this.parentsBuild.length) {
        for (const item of this.parentsBuild) {
          json.push(item.json);
        }
      }
      return json;
    },

    onConfirm() {
      this.$emit("concept-updated", this.generateParentsAsNode());
    },

    processObject(item: { key: string; value: TTIriRef[] }, position: number): any {
      return generateNewComponent(ComponentType.LOGIC, position, { iri: item.key, children: item.value }, BuilderType.PARENT);
    },

    deleteItem(data: ComponentDetails): void {
      const index = this.parentsBuild.findIndex(item => item.position === data.position);
      this.parentsBuild.splice(index, 1);
      const length = this.parentsBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (data.position === 0) {
        if (this.parentsBuild[0].type !== ComponentType.LOGIC) {
          this.parentsBuild.unshift(generateNewComponent(ComponentType.LOGIC, 0, undefined, BuilderType.PARENT));
        }
      }
      updatePositions(this.parentsBuild);
    },

    updateItem(data: ComponentDetails) {
      const index = this.parentsBuild.findIndex(item => item.position === data.position);
      this.parentsBuild[index] = data;
    },

    addItem(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
      const newComponent = generateNewComponent(data.selectedType, data.position, data.value, BuilderType.PARENT);
      if (!newComponent) return;
      this.parentsBuild[data.position] = newComponent;
      updatePositions(this.parentsBuild);
    }
  }
});
</script>

<style scoped>
#parents-builder-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

#parents-build {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  padding: 1rem;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
}
</style>
