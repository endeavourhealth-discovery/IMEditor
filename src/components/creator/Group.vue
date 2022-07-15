<template>
  <div v-if="properties.length" class="group-container">
    <div v-for="(property, index) in properties" class="property-container">
      <component :is="processComponentType(property.componentType)" :data="property" :value="propertyValues[index]" :mode="mode" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropertyGroup, PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { ref, Ref, computed, watch, inject, onMounted, PropType } from "vue";
import StringSingleSelect from "@/components/shapeComponents/StringSingleSelect.vue";
import StringSingleDisplay from "@/components/shapeComponents/StringSingleDisplay.vue";
import HtmlSingleSelect from "@/components/shapeComponents/HtmlSingleSelect.vue";
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import injectionKeys from "@/injectionKeys/injectionKeys";
import axios from "axios";
import _ from "lodash";
const { EditorMode } = Enums;
const { IM, RDF, RDFS } = Vocabulary;
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { QueryService } = Services;

const props = defineProps({
  data: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
});
watch(
  () => props.data,
  async () => {
    properties.value = props.data.property;
    await processProperties();
  }
);

const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity.value;

const queryService = new QueryService(axios);

let properties: Ref<PropertyShape[]> = ref([...props.data.property]);
let propertyValues: Ref<any[]> = ref([]);
onMounted(async () => {
  await processProperties();
});

function processComponentType(type: TTIriRef): any {
  switch (type["@id"]) {
    case IM.LABEL_COMPONENT:
      return StringSingleDisplay;
    case IM.TEXT_INPUT_COMPONENT:
      return StringSingleSelect;
    case IM.HTML_EDITOR_COMPONENT:
      return HtmlSingleSelect;
    default:
      throw new Error("Invalid component type encountered in shape group");
  }
}

async function processEntityValue(property: PropertyShape) {
  if (isObjectHasKeys(editorEntity, [property.path["@id"]])) {
    return editorEntity[property.path["@id"]];
  } else {
    if (isObjectHasKeys(property, ["function"])) {
      const query = await queryService.getQueryFromFunctionIri(property.function["@id"]);
      if (isObjectHasKeys(query)) {
        const result = await queryService.queryIM(query);
        return result;
      }
    }
  }
  return;
}

async function processProperties(): Promise<void> {
  for (const property of properties.value) {
    const value = await processEntityValue(property);
    if (value) propertyValues.value.push(value);
  }
}
</script>

<style scoped>
.group-container {
  flex: 1 1 auto;
  width: 100%;
  overflow: auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
  overflow: auto;
  gap: 2rem;
}

.property-container {
  width: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
}
</style>
