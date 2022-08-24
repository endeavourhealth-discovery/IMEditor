<template>
  <div id="definition-builder-container">
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else class="definition-buttons-container">
      <span class="float-text">Definition</span>
      <div id="definition-build">
        <template v-for="item of definitionBuild" :key="item.id">
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
import AddNext from "@/components/edit/memberEditor/builder/AddNext.vue";
import Logic from "@/components/edit/memberEditor/builder/Logic.vue";
import Entity from "@/components/edit/memberEditor/builder/Entity.vue";
import Refinement from "@/components/edit/memberEditor/builder/Refinement.vue";

export default defineComponent({
  components: { AddNext, Logic, Entity, Refinement }
});
</script>

<script setup lang="ts">
import { defineComponent, PropType, ref, Ref, inject, watch, computed, onMounted } from "vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { mapState, useStore } from "vuex";
import axios from "axios";
import _ from "lodash";
import { Vocabulary, Helpers, Enums, Services } from "im-library";
import { EntityReferenceNode, ComponentDetails, TTIriRef, PropertyShape } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { generateNewComponent, updateItem, updatePositions, addItem },
  ConceptTypeMethods: { isValueSet }
} = Helpers;
const { IM, SHACL, RDF } = Vocabulary;
const { BuilderType, ComponentType } = Enums;
const { EntityService } = Services;

const props = defineProps({
  id: { type: String, required: true },
  position: { type: Number, required: true },
  value: { type: Array as PropType<any[]>, required: true },
  showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
});

const emit = defineEmits({
  updateClicked: (_payload: ComponentDetails) => true,
  addNextOptionsClicked: (_payload: any) => true,
  deleteClicked: (_payload: any) => true,
  addClicked: (_payload: any) => true
});

const entityService = new EntityService(axios);
const store = useStore();
const filterOptions = computed(() => store.state.filterOptions);

let definitionBuild: Ref<any[]> = ref([]);
let loading = ref(true);
let logicOptions: Ref<{ iri: string; name: string }[]> = ref([
  { iri: SHACL.AND, name: "AND" },
  { iri: SHACL.OR, name: "OR" },
  { iri: SHACL.NOT, name: "NOT" }
]);
const predicate = { iri: IM.DEFINITION, label: "Definition" };

watch(
  () => _.cloneDeep(definitionBuild),
  () => {
    onConfirm();
  }
);

onMounted(async () => {
  await createBuild();
});

async function createBuild() {
  loading.value = true;
  definitionBuild.value = [];
  if (isArrayHasLength(props.value)) {
    let position = 0;
    for (const item of props.value) {
      definitionBuild.value.push(await processAny(item, position));
      position++;
    }
  } else {
    createDefaultBuild();
  }
  loading.value = false;
}

function createDefaultBuild() {
  definitionBuild.value = [
    generateNewComponent(
      ComponentType.LOGIC,
      0,
      { iri: "", children: undefined, builderType: BuilderType.MEMBER, options: logicOptions.value },
      props.shape,
      { minus: true, plus: true },
      props.mode
    )
  ];
}

function generateMembersAsNode() {
  let json = [];
  if (definitionBuild.value.length) {
    for (const item of definitionBuild.value) {
      json.push(item.json);
    }
  }
  return json;
}

function onConfirm() {
  emit("updateClicked", {
    id: props.id,
    value: definitionBuild.value,
    position: props.position,
    type: ComponentType.DEFINITION,
    json: generateMembersAsNode(),
    shape: props.shape,
    showButtons: props.showButtons,
    mode: props.mode
  });
}

async function processAny(item: any, position: number): Promise<any> {
  if (isObjectHasKeys(item, ["@id"])) return await processIri(item, position);
  else if (isArrayHasLength(item)) return processArray(item, position);
  else return processObject(item, position);
}

async function processIri(iri: TTIriRef, position: number): Promise<any> {
  const types = await entityService.getPartialEntity(iri["@id"], [RDF.TYPE]);
  if (isValueSet(types)) {
    const typeOptions = (await entityService.getEntityChildren(IM.ENTITY_TYPES)).filter(
      (type: EntityReferenceNode) => type["@id"] === IM.VALUE_SET || type["@id"] === IM.CONCEPT_SET || type["@id"] === IM.CONCEPT_SET_GROUP
    );
    const options = { status: filterOptions.value.status, schemes: filterOptions.value.schemes, types: typeOptions };
    return generateNewComponent(
      ComponentType.ENTITY,
      position,
      { filterOptions: options, entity: iri, type: ComponentType.ENTITY, label: "Set" },
      props.shape,
      { minus: true, plus: true },
      props.mode
    );
  } else {
    const typeOptions = filterOptions.value.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT);
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
}

function processObject(item: any, position: number): any {
  for (const [key, value] of Object.entries(item)) {
    if (key === SHACL.AND || key === SHACL.OR || key === SHACL.NOT) {
      return generateNewComponent(
        ComponentType.LOGIC,
        position,
        {
          iri: key,
          children: value,
          builderType: BuilderType.MEMBER,
          options: logicOptions.value
        },
        props.shape,
        { minus: true, plus: true },
        props.mode
      );
    } else {
      return generateNewComponent(
        ComponentType.REFINEMENT,
        position,
        { propertyIri: key, children: value },
        props.shape,
        {
          minus: true,
          plus: true
        },
        props.mode
      );
    }
  }
}

async function processArray(items: any[], position: number): Promise<any> {
  let arrayPosition = position;
  const result = [] as any[];
  for (const item of items) {
    result.push(await processAny(item, arrayPosition));
    arrayPosition++;
  }
  return result;
}

function deleteItem(data: ComponentDetails): void {
  const index = definitionBuild.value.findIndex(item => item.position === data.position);
  definitionBuild.value.splice(index, 1);
  const length = definitionBuild.value.length;
  if (length === 0) {
    createDefaultBuild();
    return;
  }
  updatePositions(definitionBuild.value);
}

function updateItemWrapper(data: ComponentDetails) {
  updateItem(data, definitionBuild.value);
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
    data.value = { options: logicOptions.value, iri: "", children: undefined };
  }
  addItem(data, definitionBuild.value, { minus: true, plus: true }, props.shape, props.mode);
}

function deleteClicked(): void {
  emit("deleteClicked", {
    id: props.id,
    value: definitionBuild.value,
    position: props.position,
    type: ComponentType.DEFINITION,
    shape: props.shape,
    json: generateMembersAsNode(),
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
  return [ComponentType.HAS_MEMBER];
}
</script>

<style scoped>
#definition-builder-container {
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  position: relative;
}

.definition-buttons-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: space-between;
  gap: 1rem;
}

#definition-build {
  flex: 1 1 auto;
  border: 1px solid #b00149;
  border-radius: 3px;
  padding: 1rem;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 1rem;
}

.children-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 1rem;
}

.label-container {
  width: fit-content;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
