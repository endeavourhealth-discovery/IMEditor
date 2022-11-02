<template>
  <div v-if="properties && properties.length" class="group-container">
    <div v-for="(property, index) in properties" class="property-container">
      <component :is="processComponentType(property.componentType)" :shape="property" :value="processEntityValue(property)" :mode="mode" />
    </div>
  </div>
</template>

<script lang="ts">
import ArrayBuilder from "@/components/shapeComponents/ArrayBuilder.vue";
import ArrayBuilderWithDropdown from "../shapeComponents/ArrayBuilderWithDropdown.vue";
import EntityComboBox from "../shapeComponents/EntityComboBox.vue";
import EntityDropdown from "../shapeComponents/EntityDropdown.vue";
import HtmlInput from "@/components/shapeComponents/HtmlInput.vue";
import TextInput from "@/components/shapeComponents/TextInput.vue";
import TextDisplay from "@/components/shapeComponents/TextDisplay.vue";
import SetDefinitionBuilder from "@/components/shapeComponents/SetDefinitionBuilder.vue";

export default defineComponent({
  components: { EntityComboBox, ArrayBuilder, ArrayBuilderWithDropdown, SetDefinitionBuilder, EntityDropdown, HtmlInput, TextDisplay, TextInput }
});
</script>

<script setup lang="ts">
import { PropertyGroup, PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { ref, Ref, computed, watch, inject, onMounted, PropType, defineComponent } from "vue";
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import injectionKeys from "@/injectionKeys/injectionKeys";
import axios from "axios";
import _ from "lodash";
const { ComponentType, EditorMode } = Enums;
const { IM, RDF, RDFS } = Vocabulary;
const {
  DataTypeCheckers: { isObjectHasKeys },
  TypeGuards: { isPropertyGroup, isPropertyShape },
  EditorMethods: { processComponentType }
} = Helpers;
const { QueryService } = Services;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
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
  if (isObjectHasKeys(property, ["path"]) && isObjectHasKeys(editorEntity, [property.path["@id"]])) {
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
.group-container {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
  overflow: auto;
  padding: 2rem 0 0 0;
}

.property-container {
  width: 100%;
  flex: 0 1 auto;
  max-height: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-content: flex-start;
  overflow: auto;
  padding: 2rem 0 0 0;
}
</style>
