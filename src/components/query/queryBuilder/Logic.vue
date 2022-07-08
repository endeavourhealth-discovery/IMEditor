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
import AddDeleteButtons from "@/components/query/queryBuilder/AddDeleteButtons.vue";
import AddNext from "@/components/query/queryBuilder/AddNext.vue";
import PropertyGroup from "@/components/query/queryBuilder/PropertyGroup.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums } from "im-library";
import { EntityReferenceNode, TTIriRef, QueryComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
import { BuilderType } from "im-library/dist/types/enums/Enums";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  QueryBuilderMethods: { genNextOptions, generateNewComponent, updateItem, addItem, updatePositions }
} = Helpers;
const { SHACL, IM, RDF } = Vocabulary;
const { QueryComponentType } = Enums;

export default defineComponent({
  name: "Logic",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: {
      type: Object as PropType<{ iri: string; children: any[]; options: { iri: string; name: string }[]; builderType: BuilderType }>,
      required: true
    },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  components: { AddDeleteButtons, AddNext, PropertyGroup },
  emits: {
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: QueryComponentDetails) => true,
    updateClicked: (_payload: QueryComponentDetails) => true
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
        if (!this.value.children && this.logicBuild[0].type !== QueryComponentType.ADD_NEXT) await this.init();
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
      addDefaultOptions: [QueryComponentType.PROPERTY_GROUP, QueryComponentType.MATCH, QueryComponentType.ENTITY_TYPE]
    };
  },
  methods: {
    async init() {
      this.loading = true;
      let found;
      if (isObjectHasKeys(this.value, ["options"])) {
        found = this.value.options.find(option => option.iri === this.value.iri);
      }
      this.selected = found ? found : this.value.options[1];
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
      this.logicBuild = [genNextOptions(-1, QueryComponentType.LOGIC, this.builderType)];
    },

    async processChild(child: any, position: number) {
      if (isObjectHasKeys(child, [IM.PROPERTY])) return this.processProperty(child, position);
      if (isObjectHasKeys(child, [IM.MATCH])) return this.processMatch(child, position);
      if (isObjectHasKeys(child, [IM.ENTITY_TYPE])) return this.processEntityType(child, position);
      throw new Error("invalid child while processing logic children");
    },

    processProperty(child: any, position: number) {
      return generateNewComponent(QueryComponentType.PROPERTY_GROUP, position, child[IM.PROPERTY], this.builderType, { minus: true, plus: true });
    },

    processMatch(child: any, position: number) {
      return generateNewComponent(QueryComponentType.MATCH, position, child[IM.MATCH], this.builderType, { minus: true, plus: true });
    },

    processEntityType(child: any, position: number) {
      return generateNewComponent(QueryComponentType.ENTITY_TYPE, position, child[IM.ENTITY_TYPE], this.builderType, { minus: true, plus: true });
    },

    hasChildren(data: any): data is { iri: string; children: any[] } {
      if (isArrayHasLength((data as { iri: string; children: any[] }).children)) return true;
      return false;
    },

    onConfirm(): void {
      this.$emit("updateClicked", {
        id: this.id,
        value: { iri: this.selected.iri, children: this.createChildrenAsJson(), options: this.value.options },
        position: this.position,
        type: QueryComponentType.LOGIC,
        json: this.createLogicJson(),
        builderType: this.builderType,
        showButtons: this.showButtons
      });
    },

    createLogicJson() {
      let json = {} as any;
      if (this.selected.iri) json[this.selected.iri] = {};
      if (this.logicBuild.length) {
        for (const item of this.logicBuild) {
          if (item.type !== QueryComponentType.ADD_NEXT) json[this.selected.iri] = item.json;
        }
      }
      return json;
    },

    createChildrenAsJson() {
      let json = {};
      if (this.logicBuild.length) {
        for (const item of this.logicBuild) {
          if (item.type !== QueryComponentType.ADD_NEXT && this.selected.iri === IM.SELECT) json = item.json;
        }
      }
      return json;
    },

    updateItemWrapper(data: QueryComponentDetails) {
      updateItem(data, this.logicBuild);
    },

    addItemWrapper(data: { selectedType: Enums.QueryComponentType; position: number; value: any }): void {
      if (data.selectedType === QueryComponentType.PROPERTY) {
        const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === RDF.PROPERTY);
        const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
        data.value = { filterOptions: options, entity: undefined, type: QueryComponentType.PROPERTY, label: "Property" };
      }
      if (data.selectedType === QueryComponentType.LOGIC) {
        data.value = { options: this.value.options, iri: "", children: undefined };
      }
      addItem(data, this.logicBuild, this.builderType, { minus: true, plus: true });
      this.removeAddNexts();
    },

    removeAddNexts() {
      if (this.logicBuild.some(child => child.type === QueryComponentType.ADD_NEXT) && this.logicBuild.length > 1) {
        this.logicBuild = this.logicBuild.filter(child => child.type !== QueryComponentType.ADD_NEXT);
        updatePositions(this.logicBuild);
      }
    },

    deleteItem(data: QueryComponentDetails): void {
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
            type: QueryComponentType.ADD_NEXT,
            json: {},
            builderType: data.builderType,
            showButtons: { minus: true, plus: true }
          });
        }
      }
      updatePositions(this.logicBuild);
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.selected,
        position: this.position,
        type: QueryComponentType.LOGIC,
        builderType: this.builderType,
        json: this.selected.iri,
        showButtons: this.showButtons
      });
    },

    addNextClicked(item: any): void {
      this.$emit("addNextOptionsClicked", {
        position: this.position + 1,
        selectedType: item
      });
    },

    getButtonOptions() {
      return [QueryComponentType.LOGIC];
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
