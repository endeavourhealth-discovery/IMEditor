<template>
  <div v-if="loading" class="flex flex-row justify-content-center">
    <div class="p-text-center">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else class="refinement-button-container">
    <span class="float-text">Refinement</span>
    <div v-if="refinementBuild && refinementBuild.length" class="refinement-children-container">
      <template v-for="child of refinementBuild" :key="child.id">
        <component
          :is="child.type"
          :value="child.value"
          :id="child.id"
          :position="child.position"
          :builderType="child.builderType"
          :showButtons="child.showButtons"
          @deleteClicked="deleteItem"
          @addClicked="addItemWrapper"
          @updateClicked="updateItemWrapper"
          @addNextOptionsClicked="addItemWrapper"
        >
        </component>
      </template>
    </div>
    <div class="refinement-item-container" :id="id">
      <AddDeleteButtons
        :show="showButtons"
        :position="position"
        :options="getButtonOptions()"
        @deleteClicked="deleteClicked"
        @addNextClicked="addNextClicked"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { mapState } from "vuex";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import Property from "@/components/edit/memberEditor/builder/Property.vue";
import Quantifier from "@/components/edit/memberEditor/builder/Quantifier.vue";
import AddNext from "@/components/edit/memberEditor/builder/AddNext.vue";
import { Vocabulary, Helpers, Enums } from "im-library";
import { EntityReferenceNode, NextComponentSummary, ComponentDetails, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
const {
  EditorBuilderJsonMethods: { generateNewComponent, updateItem, deleteItem, addItem, addNextOptions, scrollIntoView }
} = Helpers;
const { RDFS, RDF } = Vocabulary;
const { ComponentType } = Enums;

export default defineComponent({
  name: "Refinement",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; children: any[]; associatedMember: TTIriRef | undefined }>, required: false },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (_payload: ComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: ComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  components: { AddDeleteButtons, Property, Quantifier, AddNext },
  watch: {
    refinementBuild: {
      handler() {
        if (!this.loading) this.onConfirm();
      },
      deep: true
    }
  },
  computed: mapState(["filterOptions", "selectedFilters"]),
  async mounted() {
    await this.createBuild();
  },
  data() {
    return {
      refinementBuild: [] as ComponentDetails[],
      loading: true
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.refinementBuild = [];
      if (!this.hasData(this.value)) this.createDefaultBuild();
      else {
        let position = 0;
        const property = generateNewComponent(
          ComponentType.PROPERTY,
          position,
          {
            propertyIri: this.value.propertyIri,
            associatedMember: this.value.associatedMember
          },
          this.builderType,
          { minus: false, plus: false }
        );
        if (property) {
          this.refinementBuild.push(property);
          position++;
        }

        for (const child of this.value.children) {
          const quantifier = generateNewComponent(
            ComponentType.QUANTIFIER,
            position,
            { propertyIri: this.value.propertyIri, quantifier: child },
            this.builderType,
            { minus: false, plus: false }
          );
          if (quantifier) {
            this.refinementBuild.push(quantifier);
            position++;
          }
        }
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.refinementBuild = [];
      const property = generateNewComponent(ComponentType.PROPERTY, 0, { propertyIri: "", associatedMember: {} }, this.builderType, {
        minus: false,
        plus: false
      });
      if (property) this.refinementBuild.push(property);
      const quantifier = generateNewComponent(ComponentType.QUANTIFIER, 1, undefined, this.builderType, { minus: false, plus: false });
      if (quantifier) this.refinementBuild.push(quantifier);
    },

    hasData(data: any): data is { propertyIri: string; children: any[]; associatedMember: TTIriRef } {
      if (data && (data as { propertyIri: string; children: any[]; associatedMember: TTIriRef }).propertyIri) return true;
      return false;
    },

    deleteItem(data: ComponentDetails): void {
      const index = this.refinementBuild.findIndex(item => item.position === data.position);
      this.refinementBuild.splice(index, 1);
      const length = this.refinementBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (this.refinementBuild[0].type !== ComponentType.PROPERTY) {
        const property = generateNewComponent(
          ComponentType.PROPERTY,
          0,
          { propertyIri: this.value?.propertyIri || "", associatedMember: this.value?.associatedMember || {} },
          this.builderType,
          { minus: false, plus: false }
        );
        if (property) this.refinementBuild.unshift();
      }
      deleteItem(data, this.refinementBuild, ComponentType.REFINEMENT, this.builderType);
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.refinementBuild);
    },

    async addNextOptionsWrapper(data: NextComponentSummary): Promise<void> {
      const nextOptionsComponent = addNextOptions(data, this.refinementBuild, this.builderType);
      await this.$nextTick();
      scrollIntoView(nextOptionsComponent);
    },

    addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
      if (data.selectedType === ComponentType.ENTITY) {
        const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === RDF.PROPERTY);
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        data.value = { filterOptions: options, entity: undefined, type: ComponentType.ENTITY, label: "Property" };
      }
      addItem(data, this.refinementBuild, this.builderType, { minus: false, plus: false });
    },

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.createAsValue(),
        position: this.position,
        type: ComponentType.REFINEMENT,
        builderType: this.builderType,
        json: this.createAsJson(),
        showButtons: this.showButtons
      });
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.createAsValue(),
        position: this.position,
        type: ComponentType.REFINEMENT,
        builderType: this.builderType,
        json: this.createAsJson(),
        showButtons: this.showButtons
      });
    },

    createAsJson() {
      let json = {} as any;
      let propertyIri = "";
      let children = [] as any[];
      for (const [index, item] of this.refinementBuild.entries()) {
        if (index === 0) propertyIri = item.value.entity ? item.value.entity["@id"] : "";
        else if (item.type !== ComponentType.ADD_NEXT) children.push(item.json);
      }
      json[propertyIri] = children;
      return json;
    },

    createAsValue() {
      const children = [];
      let propertyIri = "";
      for (const [index, child] of this.refinementBuild.entries()) {
        if (index === 0) propertyIri = child.value.entity ? child.value.entity["@id"] : "";
        else children.push(child.value);
      }
      return { propertyIri: propertyIri, children: children, associatedMember: this.value?.associatedMember };
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
.refinement-button-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  padding: 1rem;
  border: 1px solid #47b8e0;
  border-radius: 3px;
  gap: 1rem;
}

.refinement-item-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.refinement-children-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: column wrap;
  gap: 1rem;
}

.label-container {
  margin: 0 1rem 0 0;
  padding: 1rem;
  border: 1px solid #ffc952;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
}

.label {
  cursor: pointer;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  padding: 0.25rem;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
