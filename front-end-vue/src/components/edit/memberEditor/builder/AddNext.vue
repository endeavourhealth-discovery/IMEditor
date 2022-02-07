<template>
  <div class="add-next-container">
    <template v-for="option of options" :key="option">
      <Button icon="fas fa-plus" :label="option" class="p-button-rounded p-button-outlined p-button-danger add-next-button" @click="addItem(option)"> </Button>
    </template>
    <Button v-if="!last" icon="fas fa-minus" class="p-button-rounded p-button-outlined p-button-danger add-next-delete-button" @click="deleteClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { ComponentDetails } from "@/models/definition/ComponentDetails";
import { NextComponentSummary } from "@/models/definition/NextComponentSummary";
import { ComponentType } from "@/models/definition/ComponentType";
import { BuilderType } from "@/models/definition/BuilderType";

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
    builderType: { type: String as PropType<BuilderType>, required: true }
  },
  emits: {
    addClicked: (payload: { selectedType: ComponentType; position: number }) => true,
    deleteClicked: (payload: ComponentDetails) => true
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
      options: [] as ComponentType[]
    };
  },
  methods: {
    addItem(selectedOption: ComponentType) {
      this.$emit("addClicked", {
        selectedType: selectedOption,
        position: this.value.previousPosition + 1
      });
    },

    deleteClicked() {
      this.$emit("deleteClicked", {
        id: this.id,
        position: this.position,
        value: null,
        type: ComponentType.ADD_NEXT,
        builderType: this.builderType,
        json: null
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
