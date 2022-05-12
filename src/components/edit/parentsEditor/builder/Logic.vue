<template>
  <div v-if="loading" class="flex flex-row justify-content-center">
    <div class="p-text-center">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else class="logic-buttons-container" :id="id">
    <div class="logic-container">
      <div class="label-container">
        <span class="float-text">Logic</span>
        <Dropdown v-model="selected" :options="options" optionLabel="name" placeholder="Select logic" />
      </div>
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
    <AddDeleteButtons :show="showButtons" :position="position" :options="buttonMenuOptions" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import Entity from "@/components/edit/memberEditor/builder/Entity.vue";
import AddNext from "@/components/edit/parentsEditor/builder/AddNext.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums } from "im-library";
import { ComponentDetails, TTIriRef, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { addItem, generateNewComponent, updateItem, updatePositions },
  ConceptTypeMethods: { isValueSet }
} = Helpers;
const { IM, RDFS } = Vocabulary;
const { BuilderType, ComponentType } = Enums;

export default defineComponent({
  name: "Logic",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ iri: string; children: PropType<Array<any>> | undefined }>, required: false },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  components: { AddDeleteButtons, AddNext, Entity },
  computed: mapState(["filterOptions"]),
  inject: ["entityType"],
  emits: {
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: ComponentDetails) => true,
    updateClicked: (_payload: ComponentDetails) => true
  },
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
      handler() {
        if (!this.value) this.init();
      },
      deep: true
    }
  },
  mounted() {
    this.init();
  },
  data() {
    return {
      options: [] as { iri: string; name: string }[],
      selected: {} as { iri: string; name: string },
      logicBuild: [] as any[],
      loading: true,
      filteredFilterOptions: {} as any,
      buttonMenuOptions: [ComponentType.LOGIC]
    };
  },
  methods: {
    init() {
      this.loading = true;
      this.setOptions();
      const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT || type["@id"] === IM.CONCEPT_SET);
      this.filteredFilterOptions = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
      if (this.value && isObjectHasKeys(this.value, ["iri", "children"])) {
        const found = this.options.find(option => option.iri === this.value?.iri);
        this.selected = found ? found : this.options[0];
        this.createBuild();
      } else {
        this.selected = this.options[0];
        this.createDefaultBuild();
      }
      this.loading = false;
    },

    createBuild() {
      this.logicBuild = [];
      if (!this.hasChildren(this.value)) {
        this.createDefaultBuild();
        return;
      }
      let position = 0;
      for (const child of this.value.children) {
        this.logicBuild.push(this.processChild(child, position));
        position++;
      }
      if (!isArrayHasLength(this.logicBuild)) {
        this.createDefaultBuild();
      }
    },

    createDefaultBuild() {
      this.logicBuild = [
        generateNewComponent(
          ComponentType.ENTITY,
          0,
          { filterOptions: this.filteredFilterOptions, entity: undefined, type: ComponentType.ENTITY, label: "Parent" },
          BuilderType.PARENT,
          { minus: true, plus: true }
        )
      ];
    },

    setOptions() {
      if (isValueSet(this.entityType)) {
        this.options = [
          { iri: IM.IS_CONTAINED_IN, name: "Contained in" },
          { iri: IM.IS_A, name: "Is a" },
          { iri: RDFS.SUBCLASS_OF, name: "Subclass of" }
        ];
      } else {
        this.options = [
          { iri: IM.IS_CONTAINED_IN, name: "Contained in" },
          { iri: IM.IS_A, name: "Is a" },
          { iri: RDFS.SUBCLASS_OF, name: "Subclass of" }
        ];
      }
    },

    processChild(child: any, position: number) {
      if (isObjectHasKeys(child, ["@id"])) return this.processIri(child, position);
    },

    processIri(iri: TTIriRef, position: number) {
      const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT || type["@id"] === IM.CONCEPT_SET);
      const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
      return generateNewComponent(
        ComponentType.ENTITY,
        position,
        { filterOptions: options, entity: iri, type: ComponentType.ENTITY, label: "Parent" },
        this.builderType,
        { minus: true, plus: true }
      );
    },

    hasChildren(data: any): data is { iri: string; children: any[] } {
      if (isArrayHasLength((data as { iri: string; children: any[] }).children)) return true;
      return false;
    },

    onConfirm(): void {
      this.$emit("updateClicked", {
        id: this.id,
        value: { iri: this.selected.iri, children: this.logicBuild },
        position: this.position,
        type: ComponentType.LOGIC,
        builderType: this.builderType,
        json: this.createLogicJson(),
        showButtons: this.showButtons
      });
    },

    createLogicJson() {
      let json = {} as any;
      if (this.selected.iri) json[this.selected.iri] = [];
      if (this.logicBuild.length) {
        for (const item of this.logicBuild) {
          if (isObjectHasKeys(item, ["json"])) json[this.selected.iri].push(item.json);
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
          (type: EntityReferenceNode) => type["@id"] === Vocabulary.IM.CONCEPT || type["@id"] === IM.CONCEPT_SET || type["@id"] === IM.VALUE_SET
        );
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        data.value = { filterOptions: options, entity: undefined, type: ComponentType.ENTITY, label: "Parent" };
      }
      addItem(data, this.logicBuild, this.builderType, { minus: true, plus: true });
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
        if (this.logicBuild[0].type !== ComponentType.ENTITY) {
          this.logicBuild.unshift(
            generateNewComponent(
              ComponentType.ENTITY,
              0,
              { filterOptions: this.filteredFilterOptions, entity: undefined, type: ComponentType.ENTITY, label: "Parent" },
              BuilderType.PARENT,
              { minus: true, plus: true }
            )
          );
        }
      }
      updatePositions(this.logicBuild);
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: { iri: this.selected.iri, children: this.value?.children },
        position: this.position,
        type: ComponentType.LOGIC,
        builderType: this.builderType,
        json: this.createLogicJson(),
        showButtons: this.showButtons
      });
    },

    addNextClicked(item: any): void {
      this.$emit("addNextOptionsClicked", {
        position: this.position + 1,
        selectedType: item
      });
    }
  }
});
</script>

<style scoped>
.logic-buttons-container {
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  gap: 1rem;
}

.logic-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row wrap;
  justify-content: flex-start;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  position: relative;
  gap: 1rem;
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
  padding-top: 1rem;
  position: relative;
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
  width: 12rem;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
