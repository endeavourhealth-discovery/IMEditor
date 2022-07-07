<template>
  <div v-if="loading" class="flex flex-row justify-content-center">
    <div class="p-text-center">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else class="property-group-button-container">
    <span class="float-text">Property Group</span>
    <div v-if="propertyGroupBuild && propertyGroupBuild.length" class="property-group-children-container">
      <template v-for="child of propertyGroupBuild" :key="child.id">
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
    <AddDeleteButtons :show="showButtons" :position="position" :options="getButtonOptions()" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { mapState } from "vuex";
import AddDeleteButtons from "@/components/query/queryBuilder/AddDeleteButtons.vue";
import Property from "@/components/query/queryBuilder/Property.vue";
import AddNext from "@/components/query/queryBuilder/AddNext.vue";
import { Vocabulary, Helpers, Enums } from "im-library";
import { EntityReferenceNode, QueryNextComponentSummary, QueryComponentDetails, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
const {
  QueryBuilderMethods: { generateNewComponent, updateItem, addItem, addNextOptions, scrollIntoView, updatePositions },
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { IM, RDFS, RDF } = Vocabulary;
const { QueryComponentType } = Enums;

export default defineComponent({
  name: "PropertyGroup",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Array as PropType<any[]>, required: false },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (_payload: QueryComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: QueryComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  components: { AddDeleteButtons, Property, AddNext },
  watch: {
    propertyGroupBuild: {
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
      propertyGroupBuild: [] as QueryComponentDetails[],
      loading: true
    };
  },
  methods: {
    async createBuild() {
      this.loading = true;
      this.propertyGroupBuild = [];
      if (!this.hasData(this.value)) this.createDefaultBuild();
      else {
        let position = 0;
        for (const item of this.value) {
          const property = generateNewComponent(QueryComponentType.PROPERTY, position, item.value, this.builderType, { minus: true, plus: true });
          if (property) {
            this.propertyGroupBuild.push(property);
            position++;
          }
        }
      }
      this.loading = false;
    },

    createDefaultBuild() {
      this.propertyGroupBuild = [];
      const property = generateNewComponent(QueryComponentType.PROPERTY, 0, undefined, this.builderType, {
        minus: true,
        plus: true
      });
      if (property) this.propertyGroupBuild.push(property);
    },

    hasData(data: any): data is any[] {
      if (data && (data as any[]).length) return true;
      return false;
    },

    deleteItem(data: QueryComponentDetails): void {
      const index = this.propertyGroupBuild.findIndex(item => item.position === data.position);
      this.propertyGroupBuild.splice(index, 1);
      const length = this.propertyGroupBuild.length;
      if (length === 0) {
        this.createDefaultBuild();
        return;
      }
      if (this.propertyGroupBuild[0].type !== QueryComponentType.PROPERTY) {
        const property = generateNewComponent(QueryComponentType.PROPERTY, 0, undefined, this.builderType, { minus: false, plus: false });
        if (property) this.propertyGroupBuild.unshift(property);
      }
      updatePositions(this.propertyGroupBuild);
    },

    updateItemWrapper(data: QueryComponentDetails) {
      updateItem(data, this.propertyGroupBuild);
    },

    async addNextOptionsWrapper(data: QueryNextComponentSummary): Promise<void> {
      const nextOptionsComponent = addNextOptions(data, this.propertyGroupBuild, this.builderType);
      await this.$nextTick();
      scrollIntoView(nextOptionsComponent);
    },

    addItemWrapper(data: { selectedType: Enums.QueryComponentType; position: number; value: any }): void {
      addItem(data, this.propertyGroupBuild, this.builderType, { minus: false, plus: false });
    },

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.createChildrenAsJson(),
        position: this.position,
        type: QueryComponentType.PROPERTY_GROUP,
        builderType: this.builderType,
        json: this.createAsJson(),
        showButtons: this.showButtons
      });
    },

    createChildrenAsJson() {
      const json = [] as any[];
      for (const item of this.propertyGroupBuild) {
        if (item.type !== QueryComponentType.ADD_NEXT) json.push(item.json);
      }
      return json;
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.propertyGroupBuild,
        position: this.position,
        type: QueryComponentType.PROPERTY_GROUP,
        builderType: this.builderType,
        json: this.createAsJson(),
        showButtons: this.showButtons
      });
    },

    createAsJson() {
      let json = {} as any;
      let properties = [];
      if (this.propertyGroupBuild.length) {
        for (const item of this.propertyGroupBuild) {
          if (item.type !== QueryComponentType.ADD_NEXT) properties.push(item.json);
        }
      }
      json[IM.PROPERTY] = properties;
      return json;
    },

    addNextClicked(item: any): void {
      this.$emit("addNextOptionsClicked", {
        position: this.position + 1,
        selectedType: item
      });
    },

    getButtonOptions() {
      return [QueryComponentType.PROPERTY_GROUP];
    }
  }
});
</script>

<style scoped>
.property-group-button-container {
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

.property-group-children-container {
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
