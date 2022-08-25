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
            :shape="item.shape"
            :mode="item.mode"
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
import Entity from "@/components/shapeComponents/builder/Entity.vue";
import AddNext from "@/components/shapeComponents/builder/AddNext.vue";
import Refinement from "@/components/shapeComponents/builder/Refinement.vue";

export default defineComponent({
  components: { Entity, AddNext, Refinement }
});
</script>

<script setup lang="ts">
import { defineComponent, PropType, ref, Ref, watch, computed, onMounted } from "vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import _ from "lodash";
import { mapState, useStore } from "vuex";
import { Vocabulary, Helpers, Enums } from "im-library";
import { EntityReferenceNode, TTIriRef, ComponentDetails, PropertyShape, PropertyGroup } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { genNextOptions, generateNewComponent, updateItem, addItem, updatePositions }
} = Helpers;
const { SHACL, IM } = Vocabulary;
const { ComponentType } = Enums;

const props = defineProps({
  id: { type: String, required: true },
  position: { type: Number, required: true },
  value: {
    type: Object as PropType<{ iri: string; children: PropType<Array<any>> | undefined; options: { iri: string; name: string }[] }>,
    required: true
  },
  showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
  shape: { type: Object as PropType<PropertyShape | PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
});

const emit = defineEmits({
  addNextOptionsClicked: (_payload: any) => true,
  deleteClicked: (_payload: ComponentDetails) => true,
  updateClicked: (_payload: ComponentDetails) => true
});

const store = useStore();
const filterOptions = computed(() => store.state.filterOptions);

let selected: Ref<{ iri: string; name: string }> = ref({} as { iri: string; name: string });
let logicBuild: Ref<any[]> = ref([]);
let loading = ref(true);

const addDefaultOptions = [ComponentType.LOGIC, ComponentType.ENTITY, ComponentType.REFINEMENT];

watch(selected, () => {
  if (!loading.value) onConfirm();
});

watch(logicBuild, () => {
  updateRefinementsAssociatedMembers();
  onConfirm();
});

watch(
  () => _.cloneDeep(props.value),
  async () => {
    if (!props.value.children && logicBuild.value[0].type !== ComponentType.ADD_NEXT) await init();
  }
);

onMounted(async () => {
  await init();
});

async function init() {
  loading.value = true;
  let found;
  if (isObjectHasKeys(props.value, ["options"])) {
    found = props.value.options.find(option => option.iri === props.value.iri);
  }
  selected.value = found ? found : props.value.options[1];
  await createBuild();
  loading.value = false;
}

async function createBuild() {
  logicBuild.value = [];
  if (!hasChildren(props.value)) {
    createDefaultBuild();
    return;
  }
  let position = 0;
  for (const child of props.value.children) {
    logicBuild.value.push(await processChild(child, position));
    position++;
  }
  if (!isArrayHasLength(logicBuild.value)) {
    createDefaultBuild();
  }
}

function createDefaultBuild() {
  selected.value = props.value.options[0];
  logicBuild.value = [genNextOptions(-1, ComponentType.LOGIC, props.shape, props.mode)];
}

async function processChild(child: any, position: number) {
  if (isObjectHasKeys(child, ["@id"])) return await processIri(child, position);
  else if (isObjectHasKeys(child, [SHACL.AND]) || isObjectHasKeys(child, [SHACL.OR]) || isObjectHasKeys(child, [SHACL.NOT]))
    return processLogic(child, position);
  else return processRefinement(child, position);
}

function processLogic(child: any, position: number) {
  for (const [key, value] of Object.entries(child)) {
    return generateNewComponent(ComponentType.LOGIC, position, { iri: key, children: value }, props.shape, { minus: true, plus: true }, props.mode);
  }
}

async function processIri(iri: TTIriRef, position: number) {
  const typeOptions = filterOptions.value.types.filter(
    (type: EntityReferenceNode) =>
      type["@id"] === IM.VALUE_SET || type["@id"] === IM.CONCEPT_SET || type["@id"] === IM.CONCEPT_SET_GROUP || type["@id"] === IM.CONCEPT
  );
  const options = { status: filterOptions.value.status, schemes: filterOptions.value.schemes, types: typeOptions };
  return generateNewComponent(
    ComponentType.ENTITY,
    position,
    { filterOptions: options, entity: iri, type: ComponentType.ENTITY, label: "Member" },
    props.shape,
    { minus: true, plus: true },
    props.mode
  );
}

function processRefinement(child: any, position: number) {
  for (const [key, value] of Object.entries(child)) {
    const associatedMember = getRefinementAssociatedmember(position);
    return generateNewComponent(
      ComponentType.REFINEMENT,
      position,
      { propertyIri: key, children: value, associatedMember: associatedMember },
      props.shape,
      { minus: true, plus: true },
      props.mode
    );
  }
}

function getRefinementAssociatedmember(position: number) {
  let associatedMember = {} as TTIriRef;
  let i = position - 1;
  while (i >= 0) {
    if (logicBuild.value[i] && logicBuild.value[i].type === ComponentType.ENTITY) {
      associatedMember = logicBuild.value[i].value.entity;
      i = -1;
    }
    i--;
  }
  return associatedMember;
}

function updateRefinementsAssociatedMembers() {
  for (const item of logicBuild.value) {
    if (item.type === ComponentType.REFINEMENT && item.value) {
      const associatedMember = getRefinementAssociatedmember(item.position);
      item.value.associatedMember = associatedMember;
    }
  }
}

function hasChildren(data: any): data is { iri: string; children: any[] } {
  if (isArrayHasLength((data as { iri: string; children: any[] }).children)) return true;
  return false;
}

function onConfirm(): void {
  emit("updateClicked", {
    id: props.id,
    value: { iri: selected.value.iri, children: logicBuild.value, options: props.value.options },
    position: props.position,
    type: ComponentType.LOGIC,
    json: createLogicJson(),
    shape: props.shape,
    showButtons: props.showButtons,
    mode: props.mode
  });
}

function createLogicJson() {
  let json = {} as any;
  if (selected.value.iri) json[selected.value.iri] = [];
  if (logicBuild.value.length) {
    for (const item of logicBuild.value) {
      if (item.type !== ComponentType.ADD_NEXT) json[selected.value.iri].push(item.json);
    }
  }
  return json;
}

function updateItemWrapper(data: ComponentDetails) {
  updateItem(data, logicBuild.value);
}

function addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
  if (data.selectedType === ComponentType.ENTITY) {
    const typeOptions = filterOptions.value.types.filter(
      (type: EntityReferenceNode) =>
        type["@id"] === IM.VALUE_SET || type["@id"] === IM.CONCEPT_SET || type["@id"] === IM.CONCEPT_SET_GROUP || type["@id"] === IM.CONCEPT
    );
    const options = { status: filterOptions.value.status, schemes: filterOptions.value.schemes, types: typeOptions };
    data.value = { filterOptions: options, entity: undefined, type: ComponentType.ENTITY, label: "Member" };
  }
  if (data.selectedType === ComponentType.LOGIC) {
    data.value = { options: props.value.options, iri: "", children: undefined };
  }
  addItem(data, logicBuild.value, { minus: true, plus: true }, props.shape, props.mode);
  removeAddNexts();
}

function removeAddNexts() {
  if (logicBuild.value.some(child => child.type === ComponentType.ADD_NEXT) && logicBuild.value.length > 1) {
    logicBuild.value = logicBuild.value.filter(child => child.type !== ComponentType.ADD_NEXT);
    updatePositions(logicBuild.value);
  }
}

function deleteItem(data: ComponentDetails): void {
  const index = logicBuild.value.findIndex(item => item.position === data.position);
  logicBuild.value.splice(index, 1);
  const length = logicBuild.value.length;
  if (length === 0) {
    createDefaultBuild();
    return;
  }
  if (data.position === 0) {
    if (!addDefaultOptions.includes(logicBuild.value[0].type)) {
      logicBuild.value.unshift({
        id: "addNext_" + 0,
        value: {
          previousPosition: data.position,
          previousComponentType: data.type
        },
        position: 0,
        type: ComponentType.ADD_NEXT,
        json: {},
        shape: data.shape,
        showButtons: { minus: true, plus: true },
        mode: data.mode
      });
    }
  }
  updatePositions(logicBuild.value);
}

function deleteClicked(): void {
  emit("deleteClicked", {
    id: props.id,
    value: selected.value,
    position: props.position,
    type: ComponentType.LOGIC,
    shape: props.shape,
    json: selected.value.iri,
    showButtons: props.showButtons,
    mode: props.mode
  });
}

function addNextClicked(item: any): void {
  emit("addNextOptionsClicked", {
    position: props.position + 1,
    selectedType: item
  });
}

function getButtonOptions() {
  return [ComponentType.ENTITY, ComponentType.LOGIC, ComponentType.REFINEMENT];
}
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
