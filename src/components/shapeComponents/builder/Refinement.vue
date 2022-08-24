<template>
  <div v-if="loading" class="flex flex-row justify-content-center">
    <div class="p-text-center">
      <ProgressSpinner />
    </div>
  </div>
  <div v-else class="refinement-button-container">
    <span class="float-text">Refinement</span>
    <div v-if="refinementBuild && refinementBuild.length" class="refinement-children-container">
      <template v-for="child of refinementBuild" :key="child.id">
        <component
          :is="child.type"
          :value="child.value"
          :id="child.id"
          :position="child.position"
          :shape="child.shape"
          :showButtons="child.showButtons"
          :mode="child.mode"
          @deleteClicked="deleteItem"
          @addClicked="addItemWrapper"
          @updateClicked="updateItemWrapper"
          @addNextOptionsClicked="addItemWrapper"
        >
        </component>
      </template>
    </div>
    <div class="refinement-item-container" :id="id">
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
import Property from "@/components/edit/memberEditor/builder/Property.vue";
import Quantifier from "@/components/edit/memberEditor/builder/Quantifier.vue";
import AddNext from "@/components/edit/memberEditor/builder/AddNext.vue";

export default defineComponent({
  components: { Property, Quantifier, AddNext }
});
</script>

<script setup lang="ts">
import { defineComponent, PropType, ref, Ref, watch, computed, onMounted, nextTick } from "vue";
import { mapState, useStore } from "vuex";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import _ from "lodash";
import { Vocabulary, Helpers, Enums } from "im-library";
import {
  EntityReferenceNode,
  NextComponentSummary,
  ComponentDetails,
  TTIriRef,
  PropertyShape,
  PropertyGroup
} from "im-library/dist/types/interfaces/Interfaces";
const {
  EditorBuilderJsonMethods: { generateNewComponent, updateItem, addItem, addNextOptions, scrollIntoView, updatePositions }
} = Helpers;
const { RDFS, RDF } = Vocabulary;
const { ComponentType } = Enums;

const props = defineProps({
  id: { type: String, required: true },
  position: { type: Number, required: true },
  value: { type: Object as PropType<{ propertyIri: string; children: any[]; associatedMember: TTIriRef | undefined }>, required: false },
  showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
  shape: { type: Object as PropType<PropertyShape | PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
});

const emit = defineEmits({
  updateClicked: (_payload: ComponentDetails) => true,
  addNextOptionsClicked: (_payload: any) => true,
  deleteClicked: (_payload: ComponentDetails) => true,
  addClicked: (_payload: any) => true
});

const store = useStore();
const filterOptions = computed(() => store.state.filterOptions);

onMounted(async () => {
  await createBuild();
});

let refinementBuild: Ref<ComponentDetails[]> = ref([]);
let loading = ref(true);

watch(refinementBuild, () => {
  if (!loading.value) onConfirm();
});

async function createBuild() {
  loading.value = true;
  refinementBuild.value = [];
  if (!hasData(props.value)) createDefaultBuild();
  else {
    let position = 0;
    const property = generateNewComponent(
      ComponentType.PROPERTY,
      position,
      {
        propertyIri: props.value.propertyIri,
        associatedMember: props.value.associatedMember
      },
      props.shape,
      { minus: false, plus: false },
      props.mode
    );
    if (property) {
      refinementBuild.value.push(property);
      position++;
    }

    for (const child of props.value.children) {
      const quantifier = generateNewComponent(
        ComponentType.QUANTIFIER,
        position,
        { propertyIri: props.value.propertyIri, quantifier: child },
        props.shape,
        { minus: false, plus: false },
        props.mode
      );
      if (quantifier) {
        refinementBuild.value.push(quantifier);
        position++;
      }
    }
  }
  loading.value = false;
}

function createDefaultBuild() {
  refinementBuild.value = [];
  const property = generateNewComponent(
    ComponentType.PROPERTY,
    0,
    { propertyIri: "", associatedMember: {} },
    props.shape,
    { minus: false, plus: false },
    props.mode
  );
  if (property) refinementBuild.value.push(property);
  const quantifier = generateNewComponent(
    ComponentType.QUANTIFIER,
    1,
    { propertyIri: "", quantifier: {} },
    props.shape,
    { minus: false, plus: false },
    props.mode
  );
  if (quantifier) refinementBuild.value.push(quantifier);
}

function hasData(data: any): data is { propertyIri: string; children: any[]; associatedMember: TTIriRef } {
  if (data && (data as { propertyIri: string; children: any[]; associatedMember: TTIriRef }).propertyIri) return true;
  return false;
}

function deleteItem(data: ComponentDetails): void {
  const index = refinementBuild.value.findIndex(item => item.position === data.position);
  refinementBuild.value.splice(index, 1);
  const length = refinementBuild.value.length;
  if (length === 0) {
    createDefaultBuild();
    return;
  }
  if (refinementBuild.value[0].type !== ComponentType.PROPERTY) {
    const property = generateNewComponent(
      ComponentType.PROPERTY,
      0,
      { propertyIri: props.value?.propertyIri || "", associatedMember: props.value?.associatedMember || {} },
      props.shape,
      { minus: false, plus: false },
      props.mode
    );
    if (property) refinementBuild.value.unshift(property);
  }
  updatePositions(refinementBuild.value);
}

function updateItemWrapper(data: ComponentDetails) {
  updateItem(data, refinementBuild.value);
}

async function addNextOptionsWrapper(data: NextComponentSummary): Promise<void> {
  const nextOptionsComponent = addNextOptions(data, refinementBuild.value, props.shape, props.mode);
  await nextTick();
  scrollIntoView(nextOptionsComponent);
}

function addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
  if (data.selectedType === ComponentType.PROPERTY) {
    data.value = { propertyIri: props.value?.propertyIri, associatedMember: props.value?.associatedMember };
  }
  addItem(data, refinementBuild.value, { minus: false, plus: false }, props.shape, props.mode);
}

function onConfirm() {
  emit("updateClicked", {
    id: props.id,
    value: createAsValue(),
    position: props.position,
    type: ComponentType.REFINEMENT,
    shape: props.shape,
    json: createAsJson(),
    showButtons: props.showButtons,
    mode: props.mode
  });
}

function deleteClicked(): void {
  emit("deleteClicked", {
    id: props.id,
    value: createAsValue(),
    position: props.position,
    type: ComponentType.REFINEMENT,
    shape: props.shape,
    json: createAsJson(),
    showButtons: props.showButtons,
    mode: props.mode
  });
}

function createAsJson() {
  let json = {} as any;
  let propertyIri = "";
  let children = [] as any[];
  for (const [index, item] of refinementBuild.value.entries()) {
    if (index === 0) propertyIri = item.value.propertyIri ? item.value.propertyIri : "";
    else if (item.type !== ComponentType.ADD_NEXT) children.push(item.json);
  }
  json[propertyIri] = children;
  return json;
}

function createAsValue() {
  const children = [];
  let propertyIri = "";
  for (const [index, child] of refinementBuild.value.entries()) {
    if (index === 0) propertyIri = child.value.propertyIri ? child.value.propertyIri : "";
    else children.push(child.value);
  }
  return { propertyIri: propertyIri, children: children, associatedMember: props.value?.associatedMember };
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
.refinement-button-container {
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

.refinement-item-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.refinement-children-container {
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
