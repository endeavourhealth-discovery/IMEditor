<template>
  <div id="has-members-builder-container">
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else class="has-members-buttons-container">
      <span class="float-text">Has members</span>
      <div id="has-members-build">
        <template v-for="item of hasMembersBuild" :key="item.id">
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
import Entity from "@/components/edit/memberEditor/builder/Entity.vue";
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
  name: "HasMembers",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Array as PropType<any[]>, required: true },
    showButtons: { type: Boolean, default: true },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  components: { AddDeleteButtons, AddNext, Entity },
  emits: {
    addNextOptionsClicked: (payload: any) => true,
    deleteClicked: (payload: ComponentDetails) => true,
    updateClicked: (payload: ComponentDetails) => true
  },
  computed: mapState(["filterOptions"]),
  watch: {
    hasMembersBuild: {
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
      hasMembersBuild: [] as any[],
      loading: true,
      logicOptions: [
        { iri: SHACL.AND, name: "AND" },
        { iri: SHACL.OR, name: "OR" },
        { iri: SHACL.NOT, name: "NOT" }
      ] as { iri: string; name: string }[],
      filterOptions: {} as any,
      filterConfig: [IM.CONCEPT, IM.CONCEPT_SET_GROUP, IM.CONCEPT_SET, IM.VALUE_SET]
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.hasMembersBuild = [];
      const memberTypeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => this.filterConfig.some(config => config === type["@id"]));
      this.filterOptions = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: memberTypeOptions };
      if (isArrayHasLength(this.value)) {
        let position = 0;
        for (const item of this.value) {
          this.hasMembersBuild.push(await this.processAny(item, position));
          position++;
        }
      } else {
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.hasMembersBuild = [
        generateNewComponent(
          ComponentType.ENTITY,
          0,
          { filterOptions: this.filterOptions, entity: undefined, type: ComponentType.ENTITY, label: "Member" },
          BuilderType.MEMBER,
          true
        )
      ];
    },

    generateMembersAsNode() {
      let json = [];
      if (this.hasMembersBuild.length) {
        for (const item of this.hasMembersBuild) {
          json.push(item.json);
        }
      }
      return json;
    },

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.hasMembersBuild,
        position: this.position,
        type: ComponentType.DEFINITION,
        json: this.generateMembersAsNode(),
        builderType: this.builderType,
        showButtons: true
      });
    },

    processAny(item: any, position: number): any {
      if (isObjectHasKeys(item, ["@id"])) return this.processIri(item, position);
      else if (isArrayHasLength(item)) return this.processArray(item, position);
      else throw new Error("HasMembers component received unexpected format for 'value' prop");
    },

    processIri(iri: TTIriRef, position: number): any {
      return generateNewComponent(
        ComponentType.ENTITY,
        position,
        { filterOptions: this.filterOptions, entity: iri, type: ComponentType.ENTITY, label: "Member" },
        BuilderType.MEMBER,
        true
      );
    },

    processArray(items: any[], position: number): any {
      let arrayPosition = position;
      const result = [] as any[];
      for (const item of items) {
        result.push(this.processAny(item, arrayPosition));
        arrayPosition++;
      }
      return result;
    },

    deleteItem(data: ComponentDetails): void {
      const index = this.hasMembersBuild.findIndex(item => item.position === data.position);
      this.hasMembersBuild.splice(index, 1);
      const length = this.hasMembersBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (data.position === 0) {
        if (this.hasMembersBuild[0].type !== ComponentType.LOGIC) {
          this.hasMembersBuild.unshift(generateNewComponent(ComponentType.LOGIC, 0, undefined, BuilderType.MEMBER, true));
        }
      }
      updatePositions(this.hasMembersBuild);
    },

    updateItemWrapper(data: ComponentDetails) {
      updateItem(data, this.hasMembersBuild);
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
      addItem(data, this.hasMembersBuild, BuilderType.MEMBER, true);
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.hasMembersBuild,
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
#has-members-builder-container {
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  position: relative;
}

.has-members-buttons-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  gap: 1rem;
}

#has-members-build {
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
