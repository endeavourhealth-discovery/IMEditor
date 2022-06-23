<template>
  <div id="query-builder-container">
    <h3>Query builder</h3>
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else id="query-build">
      <template v-for="item of queryBuild" :key="item.id">
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
</template>

<script lang="ts">
import { defineComponent, onMounted, Ref, ref, watch } from "vue";
import _ from "lodash";
import Logic from "@/components/query/queryBuilder/Logic.vue";
import { Enums, Helpers } from "im-library";
import { ComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isObjectHasKeys },
  QueryBuilderMethods: { generateNewComponent, addItem, updateItem, updatePositions }
} = Helpers;
const { BuilderType, QueryComponentType } = Enums;

export default defineComponent({
  name: "QueryBuilder",
  components: { Logic },
  props: { updatedQuery: { type: Object, required: true } },
  emits: { "query-updated": (_payload: any) => true },
  setup(props, { emit }) {
    const loading: Ref<boolean> = ref(true);

    const queryBuild: Ref<any[]> = ref([]);

    onMounted(() => {
      createBuild();
    });

    watch(
      () => _.cloneDeep(queryBuild.value),
      newValue => {
        builderUpdated(newValue);
      }
    );

    function createBuild() {
      loading.value = true;
      queryBuild.value = [];
      if (!isObjectHasKeys(props.updatedQuery, ["select"])) {
        createDefaultBuild();
        loading.value = false;
        return;
      }
      queryBuild.value.push(generateNewComponent(QueryComponentType.LOGIC, 0, props.updatedQuery.select, BuilderType.QUERY, { minus: false, plus: true }));
      loading.value = false;
    }

    const logicOptions: Ref<{ iri: string; name: string }[]> = ref([{ iri: "select", name: "SELECT" }]);

    function createDefaultBuild() {
      queryBuild.value = [
        generateNewComponent(
          QueryComponentType.LOGIC,
          0,
          { iri: "", children: undefined, builderType: BuilderType.QUERY, options: logicOptions },
          BuilderType.QUERY,
          { minus: false, plus: true }
        )
      ];
    }

    function builderUpdated(data: any) {
      let query = {} as any;
      for (const [key, value] of Object.entries(data)) {
        query[key] = value;
      }
      emit("query-updated", query);
    }

    function deleteItem(data: ComponentDetails): void {
      const index = queryBuild.value.findIndex(item => item.position === data.position);
      queryBuild.value.splice(index, 1);
      if (queryBuild.value.length === 0) {
        createDefaultBuild();
        return;
      }
      updatePositions(queryBuild.value);
    }

    function addItemWrapper(data: { selectedType: Enums.QueryComponentType; position: number; value: any }): void {
      addItem(data, queryBuild.value, BuilderType.QUERY, { minus: true, plus: true });
    }

    function updateItemWrapper(data: ComponentDetails) {
      updateItem(data, queryBuild.value);
    }

    return { loading, queryBuild, deleteItem, addItemWrapper, updateItemWrapper };
  }
});
</script>

<style scoped></style>
