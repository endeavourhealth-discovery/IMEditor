<template>
  <div v-if="loading" class="p-d-flex p-flex-row p-jc-center">
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
          :last="refinementBuild.length - 2 <= child.position ? true : false"
          :builderType="child.builderType"
          @deleteClicked="deleteItemWrapper"
          @addClicked="addItemWrapper"
          @updateClicked="updateItemWrapper"
          @addNextOptionsClicked="addNextOptionsWrapper"
        >
        </component>
      </template>
    </div>
    <div class="refinement-item-container" :id="id">
      <AddDeleteButtons :last="last" :position="position" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { ComponentDetails } from "@/models/definition/ComponentDetails";
import { mapState } from "vuex";
import { ComponentType } from "@/models/definition/ComponentType";
import { NextComponentSummary } from "@/models/definition/NextComponentSummary";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import Entity from "@/components/edit/memberEditor/builder/Entity.vue";
import Quantifier from "@/components/edit/memberEditor/builder/Quantifier.vue";
import AddNext from "@/components/edit/memberEditor/builder/AddNext.vue";
import { EntityReferenceNode } from "@/models/EntityReferenceNode";
import EntityService from "@/services/EntityService";
import { BuilderType } from "@/models/definition/BuilderType";
import { Vocabulary, Helpers } from "im-library";
const {
  EditorBuilderJsonMethods: { generateNewComponent, genNextOptions, updateItem, deleteItem, addItem, addNextOptions, scrollIntoView }
} = Helpers;
const { RDFS, RDF } = Vocabulary;

export default defineComponent({
  name: "Refinement",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; children: any[] }>, required: false },
    last: { type: Boolean, required: true },
    builderType: { type: String as PropType<BuilderType>, required: true }
  },
  emits: {
    updateClicked: (payload: ComponentDetails) => true,
    addNextOptionsClicked: (payload: NextComponentSummary) => true,
    deleteClicked: (payload: ComponentDetails) => true,
    addClicked: (payload: any) => true
  },
  components: { AddDeleteButtons, Entity, Quantifier, AddNext },
  watch: {
    refinementBuild: {
      handler() {
        if (this.refinementBuild.length > 1) this.onConfirm();
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
        const typeOptions = [{ "@id": RDF.PROPERTY }];
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        const propertyName = (await EntityService.getPartialEntity(this.value.propertyIri, [RDFS.LABEL]))[RDFS.LABEL];
        const property = generateNewComponent(
          ComponentType.ENTITY,
          position,
          {
            filterOptions: options,
            entity: { "@id": this.value.propertyIri, name: propertyName },
            type: ComponentType.ENTITY,
            label: "Property"
          },
          this.builderType
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
            this.builderType
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
      const propertyTypeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === RDF.PROPERTY);
      const propertyOptions = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: propertyTypeOptions };
      const property = generateNewComponent(
        ComponentType.ENTITY,
        0,
        { filterOptions: propertyOptions, entity: undefined, type: ComponentType.ENTITY },
        this.builderType
      );
      if (property) this.refinementBuild.push(property);
      const quantifier = generateNewComponent(ComponentType.QUANTIFIER, 1, undefined, this.builderType);
      if (quantifier) this.refinementBuild.push(quantifier);
    },

    hasData(data: any): data is { propertyIri: string; children: any[] } {
      if (data && (data as { propertyIri: string; children: any[] }).propertyIri) return true;
      return false;
    },

    deleteItemWrapper(data: ComponentDetails): void {
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

    addItemWrapper(data: { selectedType: ComponentType; position: number; value: any }): void {
      if (data.selectedType === ComponentType.ENTITY) {
        const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === RDF.PROPERTY);
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        data.value = { filterOptions: options, entity: undefined, type: ComponentType.ENTITY, label: "Property" };
      }
      addItem(data, this.refinementBuild, ComponentType.REFINEMENT, this.builderType);
    },

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.createAsValue(),
        position: this.position,
        type: ComponentType.REFINEMENT,
        builderType: this.builderType,
        json: this.createAsJson()
      });
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.createAsValue(),
        position: this.position,
        type: ComponentType.REFINEMENT,
        builderType: this.builderType,
        json: this.createAsJson()
      });
    },

    createAsJson() {
      let json = {} as any;
      let propertyIri = "";
      let children = [] as any[];
      for (const [index, item] of this.refinementBuild.entries()) {
        if (index === 0) propertyIri = item.value.entity ? item.value.entity["@id"] : "";
        else children.push(item.json);
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
      return { propertyIri: propertyIri, children: children };
    },

    addNextClicked(): void {
      this.$emit("addNextOptionsClicked", {
        previousComponentType: ComponentType.REFINEMENT,
        previousPosition: this.position,
        parentGroup: ComponentType.REFINEMENT
      });
    }
  }
});
</script>

<style scoped>
.refinement-button-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  position: relative;
  padding: 1rem;
  border: 1px solid #47b8e0;
  border-radius: 3px;
  margin: 0 1rem 0 0;
}

.refinement-item-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
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

.search-input {
  width: 15rem;
}
</style>
