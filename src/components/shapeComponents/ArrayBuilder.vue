<template>
  <div class="array-builder-container">
    <h3>{{ shape.name }}:</h3>
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
    </div>
    <div v-else class="children-container" :class="invalid && 'invalid'">
      <small v-if="invalid" class="validate-error">Failed validation</small>
      <template v-for="item of build" :key="item.id">
        <component
          :is="item.type"
          :value="item.value"
          :id="item.id"
          :position="item.position"
          :showButtons="item.showButtons"
          :shape="item.shape"
          :mode="mode"
          :nextComponentOptions="getNextComponentOptions()"
          @deleteClicked="deleteItem"
          @addClicked="addItemWrapper"
          @updateClicked="updateItemWrapper"
          @addNextOptionsClicked="addItemWrapper"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import BuilderChildWrapper from "./BuilderChildWrapper.vue";

export default defineComponent({
  components: { BuilderChildWrapper }
});
</script>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType, defineComponent } from "vue";
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { ComponentDetails, EntityReferenceNode, Namespace, PropertyGroup, PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  EditorBuilderJsonMethods: { generateNewComponent, updatePositions, addItem, updateItem },
  TypeGuards: { isPropertyShape, isPropertyGroup },
  EditorMethods: { processComponentType }
} = Helpers;
const { QueryService } = Services;
const { BuilderType, ComponentType } = Enums;
const { IM } = Vocabulary;

const props = defineProps({
  shape: { type: Object as PropType<PropertyShape | PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Array as PropType<TTIriRef[]>, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);

let key = props.shape.path["@id"];

let loading = ref(true);

let filters: Ref<{ status: EntityReferenceNode[]; schemes: Namespace[]; types: EntityReferenceNode[] } | undefined> = ref();

let build: Ref<ComponentDetails[]> = ref([]);
onMounted(() => {
  setFilters();
  createBuild();
});
watch(
  () => _.cloneDeep(props.shape),
  () => {
    createBuild();
  }
);
watch(
  () => _.cloneDeep(build.value),
  async () => {
    if (entityUpdate) updateEntity();
    if (validityUpdate) await updateValidity();
  }
);

function setFilters() {
  const typeOptions = store.state.filterOptions.types.filter(type => type["@id"] === IM.CONCEPT);
  filters.value = { status: store.state.filterOptions.status, schemes: store.state.filterOptions.schemes, types: typeOptions };
}

function createBuild() {
  loading.value = true;
  build.value = [];
  if (!props.value || !isArrayHasLength(props.value)) {
    createDefaultBuild();
    loading.value = false;
    return;
  }
  let position = 0;
  props.value.forEach(item => {
    build.value.push(processChild(item, position));
    position++;
  });
  for (const item in props.value) {
    build.value.push(processChild(item, position));
    position++;
  }
  if (!isArrayHasLength(build.value)) {
    createDefaultBuild();
  }
  loading.value = false;
}

function createDefaultBuild() {
  build.value = [];
  if (isPropertyGroup(props.shape))
    if (isObjectHasKeys(props.shape, ["property"])) {
      props.shape.property.forEach(property => {
        build.value.push(
          generateNewComponent(ComponentType.BUILDER_CHILD_WRAPPER, property.order - 1, undefined, property, { minus: true, plus: true }, props.mode)
        );
      });
    } else if (isObjectHasKeys(props.shape, ["subGroup"])) {
      props.shape.subGroup.forEach(subGroup => {
        build.value.push(
          generateNewComponent(ComponentType.BUILDER_CHILD_WRAPPER, subGroup.order - 1, undefined, subGroup, { minus: true, plus: true }, props.mode)
        );
      });
    }
}

function processChild(child: any, position: number) {
  return generateNewComponent(
    ComponentType.BUILDER_CHILD_WRAPPER,
    position,
    child,
    props.shape,
    {
      minus: true,
      plus: true
    },
    props.mode
  );
}

function generateBuildAsJson() {
  const jsonBuild = [] as any[];
  build.value.forEach(item => {
    if (isObjectHasKeys(item.json)) {
      jsonBuild.push(item.json);
    }
  });
  // return build.value.map(item => item.json);
  return jsonBuild;
}

let invalid = ref(false);

function updateEntity() {
  const value = generateBuildAsJson();
  const result = {} as any;
  result[key] = value;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity() {
  if (isPropertyShape(props.shape) && isObjectHasKeys(props.shape, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(generateBuildAsJson(), props.shape.validation["@id"]));
  } else {
    invalid.value = !defaultValidation();
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidation() {
  return generateBuildAsJson().every(item => isObjectHasKeys(item, ["@id", "name"]));
}

function addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any; shape: PropertyShape | PropertyGroup }): void {
  let shape;
  if (isPropertyGroup(props.shape)) {
    shape = props.shape.property.find(p => p.componentType["@id"] === IM.ENTITY_SEARCH_COMPONENT);
  }
  if (data.selectedType !== ComponentType.BUILDER_CHILD_WRAPPER) {
    data.selectedType = ComponentType.BUILDER_CHILD_WRAPPER;
  }
  if (shape) addItem(data, build.value, { minus: true, plus: true }, shape, props.mode);
}

function deleteItem(data: ComponentDetails): void {
  const index = build.value.findIndex(item => item.position === data.position);
  build.value.splice(index, 1);
  if (build.value.length === 0) {
    createDefaultBuild();
    return;
  }
  updatePositions(build.value);
}

function updateItemWrapper(data: ComponentDetails) {
  updateItem(data, build.value);
}

function getNextComponentOptions() {
  if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["subGroup"])) return props.shape.subGroup.map(subGroup => subGroup.componentType["@id"]);
  else if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["property"]))
    return props.shape.property.map(property => property.componentType["@id"]);
  else return;
}
</script>

<style scoped>
.array-builder-container {
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
}
.loading-container {
  flex: 1 1 auto;
  width: 100%;
  justify-content: center;
  align-items: center;
  display: flex;
  flex-flow: column;
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
  overflow: auto;
}
.invalid {
  border-color: #e24c4c;
}
</style>
