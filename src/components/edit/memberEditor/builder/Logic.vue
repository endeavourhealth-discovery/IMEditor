<template>
  <div v-if="loading" class="flex flex-row justify-content-center">
    <div class="p-text-center">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else class="logic-buttons-container" :id="id">
    <span class="float-text">Logic</span>
    <div class="logic-container">
      <Dropdown v-model="selected" :options="value.options" optionLabel="name" placeholder="Select logic" />
      <div class="children-container">
        <template v-for="item of logicBuild" :key="item.id">
          <component
            :is="item.type"
            :value="item.value"
            :id="item.id"
            :position="item.position"
            :showButtons="item.showButtons"
            :builderType="item.builderType"
            @deleteClicked="deleteItem"
            @addClicked="addItemWrapper"
            @updateClicked="updateItemWrapper"
            @addNextOptionsClicked="addItemWrapper"
          >
          </component>
        </template>
      </div>
    </div>
    <AddDeleteButtons :show="showButtons" :position="position" :options="getButtonOptions()" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import Entity from "@/components/edit/memberEditor/builder/Entity.vue";
import AddNext from "@/components/edit/memberEditor/builder/AddNext.vue";
import Refinement from "@/components/edit/memberEditor/builder/Refinement.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums } from "im-library";
import { EntityReferenceNode, TTIriRef, ComponentDetails, NextComponentSummary } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { genNextOptions, generateNewComponent, deleteItem, updateItem, addItem, addNextOptions, scrollIntoView }
} = Helpers;
const { SHACL, IM } = Vocabulary;
const { BuilderType, ComponentType } = Enums;

export default defineComponent({
  name: "Logic",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: {
      type: Object as PropType<{ iri: string; children: PropType<Array<any>> | undefined; options: { iri: string; name: string }[] }>,
      required: true
    },
    showButtons: { type: Boolean, default: true },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  components: { AddDeleteButtons, AddNext, Entity, Refinement },
  emits: {
    addNextOptionsClicked: (payload: any) => true,
    deleteClicked: (payload: ComponentDetails) => true,
    updateClicked: (payload: ComponentDetails) => true
  },
  computed: mapState(["filterOptions"]),
  watch: {
    selected(): void {
      if (!this.loading) {
        this.onConfirm();
      }
    },
    logicBuild: {
      handler() {
        this.onConfirm();
      },
      deep: true
    },
    value: {
      async handler() {
        if (!this.value.children && this.logicBuild[0].type !== ComponentType.ADD_NEXT) await this.init();
      },
      deep: true
    }
  },
  async mounted() {
    await this.init();
  },
  data() {
    return {
      selected: {} as { iri: string; name: string },
      logicBuild: [] as any[],
      loading: true,
      addDefaultOptions: [ComponentType.LOGIC, ComponentType.ENTITY, ComponentType.REFINEMENT]
    };
  },
  methods: {
    async init() {
      this.loading = true;
      let found;
      if (isObjectHasKeys(this.value, ["options"])) {
        found = this.value.options.find(option => option.iri === this.value.iri);
      }
      this.selected = found ? found : this.value.options[0];
      await this.createBuild();
      this.loading = false;
    },

    async createBuild() {
      this.logicBuild = [];
      if (!this.hasChildren(this.value)) {
        this.createDefaultBuild();
        return;
      }
      let position = 0;
      for (const child of this.value.children) {
        this.logicBuild.push(await this.processChild(child, position));
        position++;
      }
      if (!isArrayHasLength(this.logicBuild)) {
        this.createDefaultBuild();
      }
    },

    createDefaultBuild() {
      this.selected = this.value.options[0];
      this.logicBuild = [genNextOptions(-1, ComponentType.LOGIC, this.builderType)];
    },

    async processChild(child: any, position: number) {
      if (isObjectHasKeys(child, ["@id"])) return await this.processIri(child, position);
      else if (isObjectHasKeys(child, [SHACL.AND]) || isObjectHasKeys(child, [SHACL.OR]) || isObjectHasKeys(child, [SHACL.NOT]))
        return this.processLogic(child, position);
      else return this.processRefinement(child, position);
    },

    processLogic(child: any, position: number) {
      for (const [key, value] of Object.entries(child)) {
        return generateNewComponent(ComponentType.LOGIC, position, { iri: key, children: value }, this.builderType, true);
      }
    },

    async processIri(iri: TTIriRef, position: number) {
      const typeOptions = this.filterOptions.types.filter(
        (type: EntityReferenceNode) =>
          type["@id"] === IM.VALUE_SET || type["@id"] === IM.CONCEPT_SET || type["@id"] === IM.CONCEPT_SET_GROUP || type["@id"] === IM.CONCEPT
      );
      const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
      return generateNewComponent(
        ComponentType.ENTITY,
        position,
        { filterOptions: options, entity: iri, type: ComponentType.ENTITY, label: "Member" },
        this.builderType,
        true
      );
    },

    processRefinement(child: any, position: number) {
      for (const [key, value] of Object.entries(child)) {
        return generateNewComponent(ComponentType.REFINEMENT, position, { propertyIri: key, children: value }, this.builderType, true);
      }
    },

    hasChildren(data: any): data is { iri: string; children: any[] } {
      if (isArrayHasLength((data as { iri: string; children: any[] }).children)) return true;
      return false;
    },

    onConfirm(): void {
      this.$emit("updateClicked", {
        id: this.id,
        value: { iri: this.selected.iri, children: this.logicBuild, options: this.value.options },
        position: this.position,
        type: ComponentType.LOGIC,
        json: this.createLogicJson(),
        builderType: this.builderType,
        showButtons: true
      });
    },

    createLogicJson() {
      let json = {} as any;
      if (this.selected.iri) json[this.selected.iri] = [];
      if (this.logicBuild.length) {
        for (const item of this.logicBuild) {
          if (item.type !== ComponentType.ADD_NEXT) json[this.selected.iri].push(item.json);
        }
      }
      return json;
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.logicBuild);
    },

    addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
      if (data.selectedType === ComponentType.ENTITY) {
        const typeOptions = this.filterOptions.types.filter(
          (type: EntityReferenceNode) =>
            type["@id"] === IM.VALUE_SET || type["@id"] === IM.CONCEPT_SET || type["@id"] === IM.CONCEPT_SET_GROUP || type["@id"] === IM.CONCEPT
        );
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        data.value = { filterOptions: options, entity: undefined, type: ComponentType.ENTITY, label: "Member" };
      }
      if (data.selectedType === ComponentType.LOGIC) {
        data.value = { options: this.value.options, iri: "", children: undefined };
      }
      addItem(data, this.logicBuild, this.builderType, true);
    },

    deleteItem(data: ComponentDetails): void {
      const index = this.logicBuild.findIndex(item => item.position === data.position);
      this.logicBuild.splice(index, 1);
      const length = this.logicBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (data.position === 0) {
        if (!this.addDefaultOptions.includes(this.logicBuild[0].type)) {
          this.logicBuild.unshift({
            id: "addNext_" + 0,
            value: {
              previousPosition: data.position,
              previousComponentType: data.type,
              parentGroup: data.builderType
            },
            position: 0,
            type: ComponentType.ADD_NEXT,
            json: {},
            builderType: data.builderType,
            showButtons: true
          });
        }
      }
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.selected,
        position: this.position,
        type: ComponentType.LOGIC,
        builderType: this.builderType,
        json: this.selected.iri
      });
    },

    addNextClicked(item: any): void {
      this.$emit("addNextOptionsClicked", {
        position: this.position + 1,
        selectedType: item
      });
    },

    getButtonOptions() {
      return [ComponentType.ENTITY, ComponentType.LOGIC, ComponentType.REFINEMENT];
    }
  }
});
</script>

<style scoped>
.logic-buttons-container {
  width: 100%;
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  gap: 1rem;
  position: relative;
}

.logic-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row wrap;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid #0c1793;
  border-radius: 3px;
  position: relative;
  row-gap: 1rem;
}

.p-button-label {
  padding-left: 0.5rem;
}

.query-item-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
}

.children-container {
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  flex: 1 1 auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 1rem;
}

.p-dropdown {
  width: 7rem;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
