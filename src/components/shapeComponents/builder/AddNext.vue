<template>
  <div class="add-next-container">
    <template v-for="option of options" :key="option">
      <Button icon="fa-solid fa-plus" :label="option" class="p-button-rounded p-button-outlined p-button-danger add-next-button" @click="addItem(option)">
      </Button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, PropType, ref, Ref, watch, onMounted } from "vue";
import { Enums } from "im-library";
import { NextComponentSummary, ComponentDetails, PropertyShape } from "im-library/dist/types/interfaces/Interfaces";
const { BuilderType, ComponentType } = Enums;

const props = defineProps({
  id: { type: String, required: true },
  position: { type: Number, required: true },
  last: Boolean,
  value: {
    type: Object as PropType<NextComponentSummary>,
    required: true
  },
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
});

const emit = defineEmits({
  addClicked: (_payload: { selectedType: Enums.ComponentType; position: number }) => true,
  deleteClicked: (_payload: ComponentDetails) => true
});

let options: Ref<Enums.ComponentType[]> = ref([]);

watch(options, newValue => {
  newValue.sort();
});

onMounted(() => {
  generateOptions(props.value);
});

function addItem(selectedOption: Enums.ComponentType) {
  emit("addClicked", {
    selectedType: selectedOption,
    position: props.value.previousPosition + 1
  });
}

function generateOptions(value: NextComponentSummary) {
  switch (value.previousComponentType) {
    case ComponentType.ENTITY:
      options.value = [ComponentType.LOGIC, ComponentType.ENTITY, ComponentType.REFINEMENT];
      break;
    case ComponentType.LOGIC:
      options.value = [ComponentType.ENTITY, ComponentType.LOGIC, ComponentType.REFINEMENT];

      break;
    case ComponentType.REFINEMENT:
      options.value = [ComponentType.ENTITY, ComponentType.LOGIC, ComponentType.REFINEMENT];
      break;
    default:
      console.error("Unhandled component type within member editor AddNext generateOptions switch");
      break;
  }
}
</script>

<style scoped>
.add-next-container {
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  align-items: center;
}

.add-next-button {
  border-style: dashed !important;
}
</style>
