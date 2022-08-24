<template>
  <div id="members-builder-container">
    <h3>Members builder</h3>
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <div v-else id="members-build" :class="invalid && 'invalid'">
      <small v-if="invalid" class="validate-error">Entity must have at least 1 parent.</small>
      <template v-for="item of membersBuild" :key="item.id">
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
</template>

<script lang="ts">
import HasMember from "@/components/shapeComponents/builder/HasMember.vue";
import Definition from "@/components/shapeComponents/builder/Definition.vue";

export default defineComponent({
  components: { HasMember, Definition }
});
</script>

<script setup lang="ts">
import { defineComponent, inject, onMounted, PropType, ref, Ref, watch } from "vue";
import { mapState } from "vuex";
import _ from "lodash";
import injectionKeys from "@/injectionKeys/injectionKeys";
import axios from "axios";
import { Vocabulary, Helpers, Enums, Services } from "im-library";
import { ComponentDetails, PropertyGroup, PropertyShape } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  EditorBuilderJsonMethods: { generateNewComponent, updateItem, updatePositions, addItem },
  TypeGuards: { isPropertyShape }
} = Helpers;
const { IM } = Vocabulary;
const { BuilderType, ComponentType } = Enums;
const { QueryService } = Services;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Object as PropType<any>, required: false }
});

const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const validity = inject(injectionKeys.editorValidity)?.validity;

const queryService = new QueryService(axios);

let membersBuild: Ref<any[]> = ref([]);
let loading = ref(true);
let invalid = ref(false);

watch(
  () => _.cloneDeep(membersBuild.value),
  async () => {
    if (entityUpdate) updateEntity();
    if (validityUpdate) await updateValidity();
  }
);

onMounted(async () => {
  await createBuild(editorEntity?.value);
});

async function createBuild(entity: any) {
  loading.value = true;
  membersBuild.value = [];
  if (!isObjectHasKeys(entity, [IM.DEFINITION]) && !isObjectHasKeys(entity, [IM.HAS_MEMBER])) {
    createDefaultBuild();
    loading.value = false;
    return;
  }
  if (isObjectHasKeys(entity, [IM.DEFINITION])) {
    membersBuild.value.push(generateNewComponent(ComponentType.DEFINITION, 0, entity[IM.DEFINITION], props.shape, { minus: true, plus: true }, props.mode));
  }
  if (isObjectHasKeys(entity, [IM.HAS_MEMBER])) {
    membersBuild.value.push(
      generateNewComponent(ComponentType.HAS_MEMBER, membersBuild.value.length, entity[IM.HAS_MEMBER], props.shape, { minus: true, plus: true }, props.mode)
    );
  }
  if (!isArrayHasLength(membersBuild.value)) {
    createDefaultBuild();
  }
  loading.value = false;
}

function createDefaultBuild() {
  membersBuild.value = [generateNewComponent(ComponentType.DEFINITION, 0, [], props.shape, { minus: true, plus: true }, props.mode)];
}

function generateMembersAsNode(item: ComponentDetails) {
  let json = [];
  if (membersBuild.value.length) {
    for (const item of membersBuild.value) {
      json.push(item.json);
    }
  }
  return json;
}

function updateEntity() {
  const result = {} as any;
  for (const item of membersBuild.value) {
    if (item.type === ComponentType.DEFINITION) result[IM.DEFINITION] = item.json;
    if (item.type === ComponentType.HAS_MEMBER) result[IM.HAS_MEMBER] = item.json;
  }
  if (entityUpdate && isObjectHasKeys(result)) entityUpdate(result);
}

async function updateValidity() {
  if (isPropertyShape(props.shape) && isObjectHasKeys(props.shape, ["validation"])) {
    for (const item of membersBuild.value) {
      const result = {} as { key: string; valid: boolean };
      invalid.value = !(await queryService.checkValidation(item.json, props.shape.validation["@id"]));
      if (validityUpdate) {
        if (item.type === ComponentType.DEFINITION) result.key = IM.DEFINITION;
        if (item.type === ComponentType.HAS_MEMBER) result.key = IM.HAS_MEMBER;
        result.valid = !invalid.value;
        validityUpdate(result);
      }
    }
  } else {
    for (const item of membersBuild.value) {
      const result = {} as { key: string; valid: boolean };
      invalid.value = !defaultValidation();
      if (validityUpdate) {
        if (item.type === ComponentType.DEFINITION) result.key = IM.DEFINITION;
        if (item.type === ComponentType.HAS_MEMBER) result.key = IM.HAS_MEMBER;
        result.valid = !invalid.value;
        validityUpdate(result);
      }
    }
  }
}

function defaultValidation() {
  return true;
}

function deleteItem(data: ComponentDetails): void {
  const index = membersBuild.value.findIndex(item => item.position === data.position);
  membersBuild.value.splice(index, 1);
  const length = membersBuild.value.length;
  if (length === 0) {
    createDefaultBuild();
    return;
  }
  toggleButtons();
  updatePositions(membersBuild.value);
}

function updateItemWrapper(data: ComponentDetails) {
  updateItem(data, membersBuild.value);
}

function addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any }): void {
  if (data.selectedType === ComponentType.HAS_MEMBER) data.value = [];
  if (data.selectedType === ComponentType.DEFINITION) data.value = [];
  addItem(data, membersBuild.value, { minus: true, plus: true }, props.shape, props.mode);
  toggleButtons();
}

function toggleButtons() {
  if (
    membersBuild.value.findIndex(item => item.type === ComponentType.DEFINITION) &&
    membersBuild.value.findIndex(item => item.type === ComponentType.HAS_MEMBER)
  ) {
    membersBuild.value.forEach(item => (item.showButtons = { minus: true, plus: false }));
  } else {
    membersBuild.value.forEach(item => (item.showButtons = { minus: true, plus: true }));
  }
}
</script>

<style scoped>
#members-builder-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

#members-build {
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
