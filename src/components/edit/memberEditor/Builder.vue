<template>
  <div id="members-builder-container">
    <h3>Members builder</h3>
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else id="members-build">
      <template v-for="item of membersBuild" :key="item.id">
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
        >
        </component>
      </template>
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
import { truncate } from "fs";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { genNextOptions, generateNewComponent, deleteItem, updateItem, updatePositions, scrollIntoView, addItem, addNextOptions },
  ConceptTypeMethods: { isValueSet }
} = Helpers;
const { IM, SHACL, RDF } = Vocabulary;
const { BuilderType, ComponentType } = Enums;

export default defineComponent({
  name: "Builder",
  props: { included: { type: Array as PropType<Array<any>>, required: true } },
  components: { AddDeleteButtons, AddNext, Logic, Entity, Refinement },
  emits: {
    "concept-updated": (payload: any) => true
  },
  computed: mapState(["filterOptions"]),
  watch: {
    membersBuild: {
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
      membersBuild: [] as any[],
      membersAsNode: {} as any,
      loading: true,
      logicOptions: [
        { iri: SHACL.AND, name: "AND" },
        { iri: SHACL.OR, name: "OR" },
        { iri: SHACL.NOT, name: "NOT" }
      ] as { iri: string; name: string }[]
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.membersBuild = [];
      if (!isArrayHasLength(this.included)) {
        return;
      }
      let position = 0;
      for (const item of this.included) {
        this.membersBuild.push(await this.processAny(item, position));
        position++;
      }
      if (!isArrayHasLength(this.membersBuild)) {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.membersBuild = [
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
      if (this.membersBuild.length) {
        for (const item of this.membersBuild) {
          json.push(item.json);
        }
      }
      return json;
    },

    onConfirm() {
      const def: any = {};
      def[IM.DEFINITION] = this.generateMembersAsNode();
      this.$emit("concept-updated", def);
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
      const index = this.membersBuild.findIndex(item => item.position === data.position);
      this.membersBuild.splice(index, 1);
      const length = this.membersBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (data.position === 0) {
        if (this.membersBuild[0].type !== ComponentType.LOGIC) {
          this.membersBuild.unshift(generateNewComponent(ComponentType.LOGIC, 0, undefined, BuilderType.MEMBER, true));
        }
      }
      updatePositions(this.membersBuild);
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.membersBuild);
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
      addItem(data, this.membersBuild, ComponentType.BUILDER, BuilderType.MEMBER, true);
    }
  }
});
</script>

<style scoped>
#members-builder-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

#members-build {
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
