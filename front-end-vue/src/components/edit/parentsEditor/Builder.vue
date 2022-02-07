<template>
  <div id="parents-builder-container">
    <h3>Parents builder</h3>
    <div v-if="loading" class="p-d-flex p-flex-row p-jc-center">
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
          @addNextOptionsClicked="addNextOptions"
        >
        </component>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { isArrayHasLength, isObjectHasKeys } from "@/helpers/DataTypeCheckers";
import { TTIriRef } from "@/models/TripleTree";
import { defineComponent, PropType } from "@vue/runtime-core";
import { ComponentType } from "@/models/definition/ComponentType";
import { ComponentDetails } from "@/models/definition/ComponentDetails";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { NextComponentSummary } from "@/models/definition/NextComponentSummary";
import Logic from "@/components/edit/parentsEditor/builder/Logic.vue";
import { generateNewComponent, genNextOptions, updatePositions } from "@/helpers/EditorBuilderJsonMethods";
import { BuilderType } from "@/models/definition/BuilderType";

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
      if (isArrayHasLength(this.parentsBuild)) {
        const last = this.parentsBuild.length - 1;
        this.parentsBuild.push(genNextOptions(last, this.parentsBuild[last].type, BuilderType.PARENT, ComponentType.BUILDER));
      } else {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.parentsBuild.push(generateNewComponent(ComponentType.LOGIC, 0, undefined, BuilderType.PARENT));
      this.parentsBuild.push(genNextOptions(1, ComponentType.LOGIC, BuilderType.PARENT, ComponentType.BUILDER));
    },

    generateParentsAsNode() {
      let json = [];
      if (this.parentsBuild.length) {
        for (const item of this.parentsBuild) {
          if (item.type !== ComponentType.ADD_NEXT) json.push(item.json);
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
      if (data.position === 0) {
        this.parentsBuild.unshift(genNextOptions(0, ComponentType.BUILDER, BuilderType.PARENT, ComponentType.BUILDER));
      }
      if (index < length - 1 && this.parentsBuild[index].type === ComponentType.ADD_NEXT) {
        this.parentsBuild[index] = genNextOptions(index - 1, this.parentsBuild[index - 1].type, BuilderType.PARENT, ComponentType.BUILDER);
      }
      if (this.parentsBuild[length - 1].type !== ComponentType.ADD_NEXT) {
        this.parentsBuild.push(genNextOptions(length - 1, this.parentsBuild[length - 1].type, BuilderType.PARENT, ComponentType.BUILDER));
      } else {
        this.parentsBuild[length - 1] = genNextOptions(length - 2, this.parentsBuild[length - 2].type, BuilderType.PARENT, ComponentType.BUILDER);
      }
      updatePositions(this.parentsBuild);
    },

    updateItem(data: ComponentDetails) {
      const index = this.parentsBuild.findIndex(item => item.position === data.position);
      this.parentsBuild[index] = data;
    },

    async addNextOptions(data: NextComponentSummary): Promise<void> {
      const nextOptionsComponent = genNextOptions(data.previousPosition, data.previousComponentType, data.parentGroup);
      if (data.previousPosition !== this.parentsBuild.length - 1 && this.parentsBuild[data.previousPosition + 1].type === ComponentType.ADD_NEXT) {
        this.parentsBuild[data.previousPosition + 1] = nextOptionsComponent;
      } else {
        this.parentsBuild.splice(data.previousPosition + 1, 0, nextOptionsComponent);
      }
      updatePositions(this.parentsBuild);
      await this.$nextTick();
      const itemToScrollTo = document.getElementById(nextOptionsComponent.id);
      itemToScrollTo?.scrollIntoView();
    },

    addItem(data: { selectedType: ComponentType; position: number; value: any }): void {
      const newComponent = generateNewComponent(data.selectedType, data.position, data.value, BuilderType.PARENT);
      if (!newComponent) return;
      this.parentsBuild[data.position] = newComponent;
      if (this.parentsBuild[this.parentsBuild.length - 1].type !== ComponentType.ADD_NEXT) {
        this.parentsBuild.push(
          genNextOptions(this.parentsBuild.length - 1, this.parentsBuild[this.parentsBuild.length - 1].type, BuilderType.PARENT, ComponentType.BUILDER)
        );
      }
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
  flex-grow: 100;
  width: 100%;
  overflow: auto;
  border: 1px solid black;
  border-radius: 3px;
  padding: 1rem;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
}
</style>
