<template>
  <div class="array-builder-container">
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
    </div>
    <div v-else class="children-container" :class="invalid && 'invalid'">
      <small v-if="invalid" class="validate-error">{{ validationErrorMessage }}</small>
      <template v-for="(item, index) in build" :key="item.id">
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
          @moveUpClicked="moveItemUp"
          @moveDownClicked="moveItemDown"
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
import { useStore } from "vuex";
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
const { IM, RDF, RDFS } = Vocabulary;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Array as PropType<TTIriRef[]>, required: false }
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const deleteEntityKey = inject(injectionKeys.editorEntity)?.deleteEntityKey;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);

let key = props.shape.path["@id"];

let loading = ref(true);
let validationErrorMessage = "Failed validation";
let build: Ref<ComponentDetails[]> = ref([]);
onMounted(() => {
  init();
});

watch([() => _.cloneDeep(props.value), () => _.cloneDeep(props.shape)], ([newPropsValue, newPropsShape], [oldPropsValue, oldPropsShape]) => {
  // updateBuildLength();
  if (JSON.stringify(newPropsValue) !== JSON.stringify(oldPropsValue) && build.value.length) updateBuildPropsValue();
  if (JSON.stringify(newPropsShape.path["@id"]) !== JSON.stringify(oldPropsShape.path["@id"])) init();
});

watch(
  () => _.cloneDeep(build.value),
  async newValue => {
    if (!loading.value && finishedChildLoading.value) {
      if (entityUpdate && isArrayHasLength(newValue)) updateEntity();
      if (validityUpdate) await updateValidity();
    }
  }
);

function updateBuildPropsValue() {
  if (props.value && isArrayHasLength(props.value))
    props.value.forEach((v, i) => {
      if (build.value[i] && build.value[i].value !== v) build.value[i].value = v;
    });
}

// function updateBuildShape() {
//   build.value.forEach(b => {
//     if (b.shape !== (isObjectHasKeys(props.shape, ["property"]) ? props.shape.property[0] : props.shape.subGroup[0]))
//       b.shape = isObjectHasKeys(props.shape, ["property"]) ? props.shape.property[0] : props.shape.subGroup[0];
//   });
// }

// function updateBuildLength() {
//   if (props.value && isArrayHasLength(props.value) && props.value.length !== build.value.length) {
//     if (props.value.length > build.value.length) build.value.p
// }
// }

const finishedChildLoading = computed(
  () => !build.value.some(c => (isObjectHasKeys(c.value) && !isObjectHasKeys(c.json)) || (isArrayHasLength(c.value) && !isObjectHasKeys(c.json)))
);

function init() {
  key = props.shape.path["@id"];
  if (isObjectHasKeys(props.shape, ["validationErrorMessage"])) validationErrorMessage = props.shape.validationErrorMessage;
  createBuild();
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
          generateNewComponent(
            ComponentType.BUILDER_CHILD_WRAPPER,
            property.order - 1,
            undefined,
            property,
            setButtonsByTypeAndPath(property.order - 1, true),
            props.mode
          )
        );
      });
    } else if (isObjectHasKeys(props.shape, ["subGroup"])) {
      props.shape.subGroup.forEach(subGroup => {
        build.value.push(
          generateNewComponent(
            ComponentType.BUILDER_CHILD_WRAPPER,
            subGroup.order - 1,
            undefined,
            subGroup,
            setButtonsByTypeAndPath(subGroup.order - 1, true),
            props.mode
          )
        );
      });
    }
}

function processChild(child: any, position: number) {
  return generateNewComponent(
    ComponentType.BUILDER_CHILD_WRAPPER,
    position,
    child,
    isObjectHasKeys(props.shape, ["property"]) ? props.shape.property[0] : props.shape.subGroup[0],
    setButtonsByTypeAndPath(position, true),
    props.mode
  );
}

function setButtonsByTypeAndPath(position: number, isNewItem: boolean): { minus: boolean; plus: boolean; up: boolean; down: boolean } {
  const path = props.shape.path["@id"];
  const types: TTIriRef[] = editorEntity?.value[RDF.TYPE];
  if (path === RDFS.SUBCLASS_OF) {
    return addButtonOnlyIfLast(position, isNewItem);
  } else if (path === IM.IS_CONTAINED_IN) {
    return addButtonOnlyIfLast(position, isNewItem);
  } else if (path === IM.ROLE_GROUP) {
    return addButtonOnlyIfLast(position, isNewItem);
  } else {
    return { minus: true, plus: true, up: true, down: true };
  }
}

function addButtonOnlyIfLast(position: number, isNewItem: boolean) {
  if (isNewItem && position !== build.value.length) return { minus: true, plus: false, up: false, down: false };
  else if (!isNewItem && position !== build.value.length - 1) return { minus: true, plus: false, up: false, down: false };
  else return { minus: true, plus: true, up: false, down: false };
}

function updateButtons() {
  build.value.forEach(child => (child.showButtons = setButtonsByTypeAndPath(child.position, false)));
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
  if (entityUpdate && value.length) entityUpdate(result);
}

async function updateValidity() {
  if (isPropertyShape(props.shape) && isObjectHasKeys(props.shape, ["validation"]) && editorEntity) {
    invalid.value = !(await queryService.checkValidation(props.shape.validation["@id"], editorEntity.value));
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
  if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["property"])) {
    shape = props.shape.property.find(p => processComponentType(p.componentType) === data.selectedType);
  } else if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["subGroup"])) {
    shape = props.shape.subGroup.find(s => processComponentType(s.componentType) === data.selectedType);
  }
  if (data.selectedType !== ComponentType.BUILDER_CHILD_WRAPPER) {
    data.selectedType = ComponentType.BUILDER_CHILD_WRAPPER;
  }
  if (shape) addItem(data, build.value, setButtonsByTypeAndPath(data.position, true), shape, props.mode);
  updateButtons();
}

function deleteItem(data: ComponentDetails): void {
  const index = build.value.findIndex(item => item.position === data.position);
  build.value.splice(index, 1);
  if (build.value.length === 0) {
    if (deleteEntityKey) deleteEntityKey(key);
    createDefaultBuild();
    return;
  }
  updatePositions(build.value);
  updateButtons();
}

function updateItemWrapper(data: ComponentDetails) {
  updateItem(data, build.value);
}

function getNextComponentOptions() {
  if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["subGroup"]))
    return props.shape.subGroup.map(subGroup => {
      return { type: processComponentType(subGroup.componentType), name: subGroup.name };
    });
  else if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["property"]))
    return props.shape.property.map(property => {
      return { type: processComponentType(property.componentType), name: property.name };
    });
  else return;
}

function moveItemUp(item: ComponentDetails) {
  if (item.position === 0) return;
  const found = build.value.find(o => o.position === item.position);
  if (found) {
    build.value.splice(item.position, 1);
    build.value.splice(item.position - 1, 0, found);
  }
  updatePositions(build.value);
}

function moveItemDown(item: ComponentDetails) {
  if (item.position === build.value.length - 1) return;
  const found = build.value.find(o => o.position === item.position);
  if (found) {
    build.value.splice(item.position, 1);
    build.value.splice(item.position + 1, 0, found);
    updatePositions(build.value);
  }
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
  border-radius: 3px;
  flex: 1 1 auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 1rem;
  overflow: auto;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
  padding: 0 0 0.25rem 0;
}
</style>
