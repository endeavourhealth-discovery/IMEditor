<template>
  <div v-if="properties && properties.length" class="group-container">
    <div v-for="(property, index) in properties" class="property-container">
      <component :is="processComponentType(property.componentType)" :shape="property" :value="processEntityValue(property)" :mode="mode" />
    </div>
  </div>
</template>

<script lang="ts">
import ArrayBuilder from "@/components/shapeComponents/ArrayBuilder.vue";
import EntityComboBox from "../shapeComponents/EntityComboBox.vue";
import EntityDropdown from "../shapeComponents/EntityDropdown.vue";
import HtmlInput from "@/components/shapeComponents/HtmlInput.vue";
import TextInput from "@/components/shapeComponents/TextInput.vue";
import TextDisplay from "@/components/shapeComponents/TextDisplay.vue";

export default defineComponent({
  components: { EntityComboBox, ArrayBuilder, EntityDropdown, HtmlInput, TextDisplay, TextInput }
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
  TypeGuards: { isPropertyGroup, isPropertyShape }
} = Helpers;
const { QueryService } = Services;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
});
watch(
  () => props.shape,
  async () => {
    if (props.shape && props.shape.property) properties.value = props.shape.property;
    else if (props.shape && props.shape.subGroup) properties.value = props.shape.subGroup;
    else properties.value = [];
  }
);

const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity.value;

let properties: Ref<PropertyShape[] | PropertyGroup[]> = ref([...props.shape.property]);

function processComponentType(type: TTIriRef): any {
  switch (type["@id"]) {
    case IM.TEXT_DISPLAY_COMPONENT:
      return ComponentType.TEXT_DISPLAY;
    case IM.TEXT_INPUT_COMPONENT:
      return ComponentType.TEXT_INPUT;
    case IM.HTML_INPUT_COMPONENT:
      return ComponentType.HTML_INPUT;
    case IM.ARRAY_BUILDER_COMPONENT:
      return ComponentType.ARRAY_BUILDER;
    case IM.ENTITY_SEARCH_COMPONENT:
      return ComponentType.ENTITY_SEARCH;
    case IM.ENTITY_COMBOBOX_COMPONENT:
      return ComponentType.ENTITY_COMBOBOX;
    case IM.ENTITY_DROPDOWN_COMPONENT:
      return ComponentType.ENTITY_DROPDOWN;
    default:
      throw new Error("Invalid component type encountered in shape group" + type["@id"]);
  }
}

function processEntityValue(property: PropertyShape | PropertyGroup) {
  if (isPropertyShape(property) && isObjectHasKeys(editorEntity, [property.path["@id"]])) {
    return editorEntity[property.path["@id"]];
  }
  return undefined;
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
  max-height: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  overflow: auto;
  padding: 2rem 0 0 0;
}
</style>
