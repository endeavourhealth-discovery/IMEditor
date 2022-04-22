<template>
  <div id="definition-builder-container">
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else class="definition-buttons-container">
      <span class="float-text">Definition</span>
      <div id="definition-build">
        <template v-for="item of definitionBuild" :key="item.id">
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
import EntityService from "@/services/EntityService";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import AddNext from "@/components/edit/memberEditor/builder/AddNext.vue";
import Logic from "@/components/edit/memberEditor/builder/Logic.vue";
import Entity from "@/components/edit/memberEditor/builder/Entity.vue";
import Refinement from "@/components/edit/memberEditor/builder/Refinement.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums } from "im-library";
import { NextComponentSummary, EntityReferenceNode, ComponentDetails, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { genNextOptions, generateNewComponent, deleteItem, updateItem, updatePositions, scrollIntoView, addItem, addNextOptions },
  ConceptTypeMethods: { isValueSet }
} = Helpers;
const { IM, SHACL, RDF } = Vocabulary;
const { BuilderType, ComponentType } = Enums;

export default defineComponent({
  name: "Definition",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Array as PropType<any[]>, required: true },
    showButtons: { type: Boolean, default: true },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  components: { AddDeleteButtons, AddNext, Logic, Entity, Refinement },
  emits: {
    addNextOptionsClicked: (payload: any) => true,
    deleteClicked: (payload: ComponentDetails) => true,
    updateClicked: (payload: ComponentDetails) => true
  },
  computed: mapState(["filterOptions"]),
  watch: {
    definitionBuild: {
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
      definitionBuild: [] as any[],
      definitionAsNode: {} as any,
      loading: true,
      logicOptions: [
        { iri: SHACL.AND, name: "AND" },
        { iri: SHACL.OR, name: "OR" },
        { iri: SHACL.NOT, name: "NOT" }
      ] as { iri: string; name: string }[],
      predicate: { iri: IM.DEFINITION, label: "Definition" }
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.definitionBuild = [];
      if (isArrayHasLength(this.value)) {
        let position = 0;
        for (const item of this.value) {
          this.definitionBuild.push(await this.processAny(item, position));
          position++;
        }
      } else {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.definitionBuild = [
        generateNewComponent(
          ComponentType.LOGIC,
          0,
          { iri: "", children: undefined, builderType: BuilderType.MEMBER, options: this.logicOptions },
          BuilderType.MEMBER,
          true
        )
      ];
    },

    generateMembersAsNode() {
      let json = [];
      if (this.definitionBuild.length) {
        for (const item of this.definitionBuild) {
          json.push(item.json);
        }
      }
      return json;
    },

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.definitionBuild,
        position: this.position,
        type: ComponentType.DEFINITION,
        json: this.generateMembersAsNode(),
        builderType: this.builderType,
        showButtons: true
      });
    },

    async processAny(item: any, position: number): Promise<any> {
      if (isObjectHasKeys(item, ["@id"])) return await this.processIri(item, position);
      else if (isArrayHasLength(item)) return this.processArray(item, position);
      else return this.processObject(item, position);
    },

    async processIri(iri: TTIriRef, position: number): Promise<any> {
      const types = await EntityService.getPartialEntity(iri["@id"], [RDF.TYPE]);
      if (isValueSet(types)) {
        const typeOptions = this.filterOptions.types.filter(
          (type: EntityReferenceNode) => type["@id"] === IM.VALUE_SET || type["@id"] === IM.CONCEPT_SET || type["@id"] === IM.CONCEPT_SET_GROUP
        );
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        return generateNewComponent(
          ComponentType.ENTITY,
          position,
          { filterOptions: options, entity: iri, type: ComponentType.ENTITY, label: "Set" },
          BuilderType.MEMBER,
          true
        );
      } else {
        const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT);
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        return generateNewComponent(
          ComponentType.ENTITY,
          position,
          { filterOptions: options, entity: iri, type: ComponentType.ENTITY, label: "Member" },
          BuilderType.MEMBER,
          true
        );
      }
    },

    processObject(item: any, position: number): any {
      for (const [key, value] of Object.entries(item)) {
        if (key === SHACL.AND || key === SHACL.OR || key === SHACL.NOT) {
          return generateNewComponent(
            ComponentType.LOGIC,
            position,
            {
              iri: key,
              children: value,
              builderType: BuilderType.MEMBER,
              options: this.logicOptions
            },
            BuilderType.MEMBER,
            true
          );
        } else {
          return generateNewComponent(ComponentType.REFINEMENT, position, { propertyIri: key, children: value }, BuilderType.MEMBER, true);
        }
      }
    },

    async processArray(items: any[], position: number): Promise<any> {
      let arrayPosition = position;
      const result = [] as any[];
      for (const item of items) {
        result.push(await this.processAny(item, arrayPosition));
        arrayPosition++;
      }
      return result;
    },

    deleteItem(data: ComponentDetails): void {
      const index = this.definitionBuild.findIndex(item => item.position === data.position);
      this.definitionBuild.splice(index, 1);
      const length = this.definitionBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (data.position === 0) {
        if (this.definitionBuild[0].type !== ComponentType.LOGIC) {
          this.definitionBuild.unshift(generateNewComponent(ComponentType.LOGIC, 0, undefined, BuilderType.MEMBER, true));
        }
      }
      updatePositions(this.definitionBuild);
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.definitionBuild);
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
        data.value = { options: this.logicOptions, iri: "", children: undefined };
      }
      addItem(data, this.definitionBuild, BuilderType.MEMBER, true);
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.definitionBuild,
        position: this.position,
        type: ComponentType.DEFINITION,
        builderType: this.builderType,
        json: this.generateMembersAsNode()
      });
    },

    addNextClicked(item: any): void {
      this.$emit("addNextOptionsClicked", {
        position: this.position + 1,
        selectedType: item
      });
    },

    getButtonOptions() {
      return [ComponentType.HAS_MEMBERS];
    }
  }
});
</script>

<style scoped>
#definition-builder-container {
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  position: relative;
}

.definition-buttons-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  gap: 1rem;
}

#definition-build {
  flex: 1 1 auto;
  border: 1px solid #b00149;
  border-radius: 3px;
  padding: 1rem;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 1rem;
}

.children-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 1rem;
}

.label-container {
  width: fit-content;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
