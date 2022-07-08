<template>
  <div v-if="loading" class="flex flex-row justify-content-center">
    <div class="p-text-center">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else class="property-button-container">
    <span class="float-text">Property</span>
    <div v-if="propertyBuild && propertyBuild.length" class="property-children-container">
      <template v-for="child of propertyBuild" :key="child.id">
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
    <div class="property-item-container" :id="id">
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
import AddDeleteButtons from "@/components/query/queryBuilder/AddDeleteButtons.vue";
import AddNext from "@/components/query/queryBuilder/AddNext.vue";
import Entity from "@/components/query/queryBuilder/Entity.vue";
import { Vocabulary, Helpers, Enums } from "im-library";
import { EntityReferenceNode, QueryNextComponentSummary, QueryComponentDetails, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
const {
  QueryBuilderMethods: { generateNewComponent, updateItem, addItem, addNextOptions, scrollIntoView, updatePositions },
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { IM, RDFS, RDF, SHACL } = Vocabulary;
const { QueryComponentType } = Enums;

export default defineComponent({
  name: "Property",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<any>, required: false },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (_payload: QueryComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: QueryComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  components: { AddDeleteButtons, AddNext, Entity },
  watch: {
    propertyBuild: {
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
      propertyBuild: [] as QueryComponentDetails[],
      loading: true
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.propertyBuild = [];
      if (this.hasData(this.value)) this.processChildren();
      else this.createDefaultBuild();
      this.loading = false;
    },

    processChildren() {
      if (this.hasData(this.value)) {
        let position = 0;
        for (const item of this.value) {
          if (isObjectHasKeys(this.value, ["@id"])) {
            this.propertyBuild.push(this.processIri(item, position));
            position++;
          } else if (isObjectHasKeys(this.value, [IM.SELECT])) {
            this.propertyBuild.push(this.processSelect(item, position));
          } else if (isObjectHasKeys(this.value, [IM.MATCH])) {
            this.propertyBuild.push(this.processMatch(item, position));
          } else {
            console.log("unknown key found processing property object");
          }
        }
      }
    },

    processIri(item: any, position: number): QueryComponentDetails {
      const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === SHACL.PROPERTY);
      const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
      return generateNewComponent(
        QueryComponentType.ENTITY,
        position,
        { filterOptions: options, entity: item.entity, type: QueryComponentType.ENTITY, label: "Entity" },
        this.builderType,
        { minus: true, plus: true }
      );
    },

    processSelect(item: any, position: number): QueryComponentDetails {
      return generateNewComponent(QueryComponentType.LOGIC, position, item, this.builderType, { minus: true, plus: true });
    },

    processMatch(item: any, position: number): QueryComponentDetails {
      return generateNewComponent(QueryComponentType.MATCH, position, item, this.builderType, { minus: true, plus: true });
    },

    createDefaultBuild() {
      this.propertyBuild = [];
      const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === SHACL.PROPERTY);
      const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
      const entity = generateNewComponent(
        QueryComponentType.ENTITY,
        0,
        { filterOptions: options, entity: undefined, type: QueryComponentType.ENTITY, label: "Entity" },
        this.builderType,
        {
          minus: true,
          plus: true
        }
      );
      if (entity) this.propertyBuild.push(entity);
    },

    hasData(data: any): data is any[] {
      if (data && (data as any[]).length) return true;
      return false;
    },

    deleteItem(data: QueryComponentDetails): void {
      const index = this.propertyBuild.findIndex(item => item.position === data.position);
      this.propertyBuild.splice(index, 1);
      const length = this.propertyBuild.length;
      const typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === SHACL.PROPERTY);
      const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (this.propertyBuild[0].type !== QueryComponentType.ENTITY) {
        const entity = generateNewComponent(
          QueryComponentType.ENTITY,
          0,
          { filterOptions: options, entity: undefined, type: QueryComponentType.ENTITY, label: "Entity" },
          this.builderType,
          { minus: false, plus: false }
        );
        if (entity) this.propertyBuild.unshift(entity);
      }
      updatePositions(this.propertyBuild);
    },

    updateItemWrapper(data: QueryComponentDetails) {
      updateItem(data, this.propertyBuild);
    },

    async addNextOptionsWrapper(data: QueryNextComponentSummary): Promise<void> {
      const nextOptionsComponent = addNextOptions(data, this.propertyBuild, this.builderType);
      await this.$nextTick();
      scrollIntoView(nextOptionsComponent);
    },

    addItemWrapper(data: { selectedType: Enums.QueryComponentType; position: number; value: any }): void {
      addItem(data, this.propertyBuild, this.builderType, { minus: false, plus: false });
    },

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.createAsJson(),
        position: this.position,
        type: QueryComponentType.PROPERTY,
        builderType: this.builderType,
        json: this.createAsJson(),
        showButtons: this.showButtons
      });
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.propertyBuild,
        position: this.position,
        type: QueryComponentType.PROPERTY,
        builderType: this.builderType,
        json: this.createAsJson(),
        showButtons: this.showButtons
      });
    },

    createAsJson() {
      let json = {} as any;
      if (this.propertyBuild.length) {
        for (const item of this.propertyBuild) {
          if (item.type === QueryComponentType.ENTITY && item.json !== {}) json["@id"] = item.json;
          if (item.type === QueryComponentType.LOGIC) json[IM.SELECT] = item.json;
          if (item.type === QueryComponentType.MATCH) json[IM.MATCH] = item.json;
        }
      }
      return json;
    },

    addNextClicked(item: any): void {
      this.$emit("addNextOptionsClicked", {
        position: this.position + 1,
        selectedType: item
      });
    },

    getButtonOptions() {
      return [QueryComponentType.PROPERTY];
    }
  }
});
</script>

<style scoped>
.property-button-container {
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

.property-item-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.property-children-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
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
