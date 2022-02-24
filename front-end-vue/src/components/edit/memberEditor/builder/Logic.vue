<template>
  <div v-if="loading" class="flex flex-row justify-content-center">
    <div class="p-text-center">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else class="logic-container" :id="id">
    <div class="label-container">
      <span class="float-text">Logic</span>
      <Dropdown v-model="selected" :options="value.options" optionLabel="name" placeholder="Select logic" />
    </div>
    <div class="children-container">
      <template v-for="item of logicBuild" :key="item.id">
        <component
          :is="item.type"
          :value="item.value"
          :id="item.id"
          :position="item.position"
          :last="logicBuild.length - 2 <= item.position ? true : false"
          :builderType="item.builderType"
          @deleteClicked="deleteItemWrapper"
          @addClicked="addItemWrapper"
          @updateClicked="updateItemWrapper"
          @addNextOptionsClicked="addNextOptionsWrapper"
        >
        </component>
      </template>
    </div>
    <AddDeleteButtons :last="last" :position="position" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
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
import { EntityReferenceNode, TTIriRef, ComponentDetails, NextComponentSummary } from "im-library/src/interfaces/Interfaces";
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
    last: { type: Boolean, required: true },
    builderType: { type: String as PropType<typeof BuilderType>, required: true }
  },
  components: { AddDeleteButtons, AddNext, Entity, Refinement },
  emits: {
    addNextOptionsClicked: (payload: NextComponentSummary) => true,
    deleteClicked: (payload: ComponentDetails) => true,
    updateClicked: (payload: ComponentDetails) => true
  },
  computed: mapState(["filterOptions"]),
  watch: {
    selected(): void {
      this.onConfirm();
    },
    logicBuild: {
      handler() {
        this.onConfirm();
      },
      deep: true
    }
  },
  async mounted() {
    this.loading = true;
    const found = this.value.options.find(option => option.iri === this.value.iri);
    this.selected = found ? found : this.value.options[0];
    await this.createBuild();

    this.loading = false;
  },
  data() {
    return {
      selected: {} as { iri: string; name: string },
      logicBuild: [] as any[],
      loading: true
    };
  },
  methods: {
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
      if (isArrayHasLength(this.logicBuild)) {
        const last = this.logicBuild.length - 1;
        this.logicBuild.push(genNextOptions(last, this.logicBuild[last].type, this.builderType, ComponentType.LOGIC));
      } else {
        this.createDefaultBuild();
      }
    },

    createDefaultBuild() {
      this.selected = this.value.options[0];
      this.logicBuild.push(genNextOptions(-1, ComponentType.LOGIC, this.builderType));
    },

    async processChild(child: any, position: number) {
      if (isObjectHasKeys(child, ["@id"])) return await this.processIri(child, position);
      else if (isObjectHasKeys(child, [SHACL.AND]) || isObjectHasKeys(child, [SHACL.OR]) || isObjectHasKeys(child, [SHACL.NOT]))
        return this.processLogic(child, position);
      else return this.processRefinement(child, position);
    },

    processLogic(child: any, position: number) {
      for (const [key, value] of Object.entries(child)) {
        return generateNewComponent(ComponentType.LOGIC, position, { iri: key, children: value }, this.builderType);
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
        this.builderType
      );
    },

    processRefinement(child: any, position: number) {
      for (const [key, value] of Object.entries(child)) {
        return generateNewComponent(ComponentType.REFINEMENT, position, { propertyIri: key, children: value }, this.builderType);
      }
    },

    hasChildren(data: any): data is { iri: string; children: any[] } {
      if (isArrayHasLength((data as { iri: string; children: any[] }).children)) return true;
      return false;
    },

    onConfirm(): void {
      this.$emit("updateClicked", {
        id: this.id,
        value: { iri: this.selected.iri, children: this.value.children, options: this.value.options },
        position: this.position,
        type: ComponentType.LOGIC,
        json: this.createLogicJson(),
        builderType: this.builderType
      });
    },

    createLogicJson() {
      let json = {} as any;
      if (this.selected.iri) json[this.selected.iri] = [];
      if (this.logicBuild.length) {
        for (const item of this.logicBuild) {
          if (item && item.type !== ComponentType.ADD_NEXT) json[this.selected.iri].push(item.json);
        }
      }
      return json;
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.logicBuild);
    },

    addItemWrapper(data: { selectedType: typeof ComponentType; position: number; value: any }): void {
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
      addItem(data, this.logicBuild, ComponentType.LOGIC, this.builderType);
    },

    async addNextOptionsWrapper(data: NextComponentSummary): Promise<void> {
      const nextOptionsComponent = addNextOptions(data, this.logicBuild, this.builderType);
      await this.$nextTick();
      scrollIntoView(nextOptionsComponent);
    },

    deleteItemWrapper(data: ComponentDetails): void {
      deleteItem(data, this.logicBuild, ComponentType.LOGIC, this.builderType);
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

    addNextClicked(): void {
      this.$emit("addNextOptionsClicked", {
        previousComponentType: ComponentType.LOGIC,
        previousPosition: this.position,
        parentGroup: ComponentType.LOGIC
      });
    }
  }
});
</script>

<style scoped>
.logic-container {
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: flex-start;
  margin: 0 1rem 0 0;
  padding: 1rem;
  border: 1px solid #34314c;
  border-radius: 3px;
  position: relative;
  width: fit-content;
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

.label-container {
  margin: 0 1rem 0 0;
  padding: 1rem;
  position: relative;
}

.children-container {
  margin: 0 1rem 0 0;
  padding: 1rem;
  /* border: 1px solid #34314c;
  border-radius: 3px; */
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
