<template>
  <div class="component-group-container">
    <div class="label-container">
      <span class="float-text">{{ shape.name }}</span>
      <div v-for="(property, index) in properties" class="components-container">
        <component :is="processComponentType(property.componentType)" :shape="property" :value="processEntityValue(property)" :mode="mode" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import EntityAutoComplete from "./EntityAutoComplete.vue";
import EntityComboBox from "./EntityComboBox.vue";
import EntityDropdown from "./EntityDropdown.vue";
import EntitySearch from "./EntitySearch.vue";
import TextInput from "./TextInput.vue";
import TextDisplay from "./TextDisplay.vue";
import injectionKeys from "@/injectionKeys/injectionKeys";

export default defineComponent({
  components: { EntityAutoComplete, EntityComboBox, EntityDropdown, EntitySearch, TextDisplay, TextInput }
});
</script>

<script setup lang="ts">
import { PropType, ref, Ref, watch, computed, onMounted, defineComponent, inject } from "vue";
import _ from "lodash";
import { Enums, Helpers } from "im-library";
import { PropertyGroup, PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isObjectHasKeys },
  EditorMethods: { processComponentType },
  TypeGuards: { isPropertyShape }
} = Helpers;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Array as PropType<TTIriRef[]>, required: false },
  position: { type: Number, required: false }
});

watch(
  () => props.shape,
  newValue => {
    setProperties(newValue);
  }
);

const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity.value;

let properties: Ref<PropertyShape[] | PropertyGroup[]> = ref([]);

onMounted(() => {
  setProperties(props.shape);
});

function processEntityValue(property: PropertyShape | PropertyGroup) {
  if (props.value && isPropertyShape(property)) {
    return props.value[property.order - 1];
  }
  if (isPropertyShape(property) && isObjectHasKeys(editorEntity, [property.path["@id"]])) {
    return editorEntity[property.path["@id"]];
  }
  return undefined;
}

function setProperties(shape: PropertyGroup) {
  if (isObjectHasKeys(shape, ["property"])) properties.value = shape.property;
  else if (isObjectHasKeys(shape, ["subGroup"])) properties.value = shape.subGroup;
  else properties.value = [];
}
</script>

<style scoped>
.component-group-container {
  flex: 0 1 auto;
  overflow: auto;
}

.components-container {
  display: flex;
  flex-flow: row;
}

.label-container {
  flex: 0 1 auto;
  padding: 1rem;
  border: 1px solid #ffc952;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  overflow: auto;
  gap: 1rem;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}
</style>
