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
import { Enums, Helpers, Vocabulary } from "im-library";
import { QueryComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isObjectHasKeys },
  QueryBuilderMethods: { generateNewComponent, addItem, updateItem, updatePositions }
} = Helpers;
const { BuilderType, QueryComponentType } = Enums;
const { IM } = Vocabulary;

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
      if (!isObjectHasKeys(props.updatedQuery, [IM.SELECT])) {
        createDefaultBuild();
        loading.value = false;
        return;
      }
      queryBuild.value.push(
        generateNewComponent(
          QueryComponentType.LOGIC,
          0,
          { iri: IM.SELECT, children: props.updatedQuery[IM.SELECT], builderType: BuilderType.QUERY, options: logicOptions },
          BuilderType.QUERY,
          { minus: false, plus: false }
        )
      );
      loading.value = false;
    }

    const logicOptions: Ref<{ iri: string; name: string }[]> = ref([{ iri: IM.SELECT, name: "SELECT" }]);

    function createDefaultBuild() {
      queryBuild.value = [
        generateNewComponent(
          QueryComponentType.LOGIC,
          0,
          { iri: IM.SELECT, children: undefined, builderType: BuilderType.QUERY, options: logicOptions },
          BuilderType.QUERY,
          { minus: false, plus: false }
        )
      ];
    }

    function builderUpdated(data: any) {
      let json = [] as string[];
      if (data.length) {
        for (const item of data) {
          json.push(item.json);
        }
      }
      emit("query-updated", json);
    }

    function deleteItem(data: QueryComponentDetails): void {
      const index = queryBuild.value.findIndex(item => item.position === data.position);
      queryBuild.value.splice(index, 1);
      if (queryBuild.value.length === 0) {
        createDefaultBuild();
        return;
      }
      updatePositions(queryBuild.value);
    }

    function addItemWrapper(data: { selectedType: Enums.QueryComponentType; position: number; value: any }): void {
      if (data.selectedType === QueryComponentType.LOGIC) {
        data.value = { options: logicOptions, iri: "", children: undefined };
      }
      addItem(data, queryBuild.value, BuilderType.QUERY, { minus: true, plus: true });
    }

    function updateItemWrapper(data: QueryComponentDetails) {
      updateItem(data, queryBuild.value);
    }

    return { loading, queryBuild, deleteItem, addItemWrapper, updateItemWrapper };
  }
});
</script>

<style scoped>
#query-builder-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

#query-build {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  padding: 1rem;
  gap: 1rem;
}

.invalid {
  border-color: #e24c4c !important;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
}
</style>
