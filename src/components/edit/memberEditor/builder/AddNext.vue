<template>
  <div class="add-next-container">
    <template v-for="option of options" :key="option">
      <Button icon="fas fa-plus" :label="option" class="p-button-rounded p-button-outlined p-button-danger add-next-button" @click="addItem(option)"> </Button>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { Enums } from "im-library";
import { NextComponentSummary, ComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
const { BuilderType, ComponentType } = Enums;

export default defineComponent({
  name: "AddNext",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    last: Boolean,
    value: {
      type: Object as PropType<NextComponentSummary>,
      required: true
    },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    addClicked: (_payload: { selectedType: Enums.ComponentType; position: number }) => true,
    deleteClicked: (_payload: ComponentDetails) => true
  },
  watch: {
    options: {
      handler() {
        this.options.sort();
      },
      deep: true
    }
  },
  mounted() {
    this.generateOptions(this.value);
  },
  data() {
    return {
      options: [] as Enums.ComponentType[]
    };
  },
  methods: {
    addItem(selectedOption: Enums.ComponentType) {
      this.$emit("addClicked", {
        selectedType: selectedOption,
        position: this.value.previousPosition + 1
      });
    },

    generateOptions(value: NextComponentSummary) {
      switch (value.previousComponentType) {
        case ComponentType.ENTITY:
          this.options = [ComponentType.LOGIC, ComponentType.ENTITY, ComponentType.REFINEMENT];
          break;
        case ComponentType.LOGIC:
          this.options = [ComponentType.ENTITY, ComponentType.LOGIC, ComponentType.REFINEMENT];

          break;
        case ComponentType.REFINEMENT:
          this.options = [ComponentType.ENTITY, ComponentType.LOGIC, ComponentType.REFINEMENT];
          break;
        default:
          console.error("Unhandled component type within member editor AddNext generateOptions switch");
          break;
      }
    }
  }
});
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
