<template>
  <div id="members-builder-container">
    <h3>Members builder</h3>
    <div v-if="loading" class="p-d-flex p-flex-row p-jc-center">
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
          :last="membersBuild.length - 2 <= item.position ? true : false"
          :builderType="item.builderType"
          @deleteClicked="deleteItemWrapper"
          @addClicked="addItemWrapper"
          @updateClicked="updateItemWrapper"
          @addNextOptionsClicked="addNextOptionsWrapper"
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
import { NextComponentSummary, EntityReferenceNode, ComponentDetails, TTIriRef } from "im-library/src/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { genNextOptions, generateNewComponent, deleteItem, updateItem, scrollIntoView, addItem, addNextOptions },
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
      if (isArrayHasLength(this.membersBuild)) {
        const last = this.membersBuild.length - 1;
        this.membersBuild.push(genNextOptions(last, this.membersBuild[last].type, BuilderType.MEMBER, ComponentType.BUILDER));
      } else {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.membersBuild.push(
        generateNewComponent(
          ComponentType.LOGIC,
          0,
          { iri: "", children: undefined, builderType: BuilderType.MEMBER, options: this.logicOptions },
          BuilderType.MEMBER
        )
      );
      this.membersBuild.push(genNextOptions(1, ComponentType.LOGIC, BuilderType.MEMBER, ComponentType.BUILDER));
    },

    generateMembersAsNode() {
      let json = [];
      if (this.membersBuild.length) {
        for (const item of this.membersBuild) {
          if (item && item.type !== ComponentType.ADD_NEXT) json.push(item.json);
        }
      }
      return json;
    },

    onConfirm() {
      this.$emit("concept-updated", { "http://endhealth.info/im#definition": this.generateMembersAsNode() });
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
          BuilderType.MEMBER
        );
      } else {
        const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT);
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        return generateNewComponent(
          ComponentType.ENTITY,
          position,
          { filterOptions: options, entity: iri, type: ComponentType.ENTITY, label: "Member" },
          BuilderType.MEMBER
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
            BuilderType.MEMBER
          );
        } else {
          return generateNewComponent(ComponentType.REFINEMENT, position, { propertyIri: key, children: value }, BuilderType.MEMBER);
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

    deleteItemWrapper(data: ComponentDetails): void {
      deleteItem(data, this.membersBuild, ComponentType.BUILDER, BuilderType.MEMBER);
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.membersBuild);
    },

    async addNextOptionsWrapper(data: NextComponentSummary): Promise<void> {
      const nextOptionsComponent = addNextOptions(data, this.membersBuild, BuilderType.MEMBER);
      await this.$nextTick();
      scrollIntoView(nextOptionsComponent);
    },

    addItemWrapper(data: { selectedType: ComponentType; position: number; value: any }): void {
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
      addItem(data, this.membersBuild, ComponentType.BUILDER, BuilderType.MEMBER);
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
