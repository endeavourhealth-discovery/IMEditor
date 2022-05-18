<template>
  <div class="add-next-container">
    <template v-for="option of options" :key="option">
      <Button icon="fa-solid fa-plus" :label="option" class="p-button-rounded p-button-outlined p-button-danger add-next-button" @click="addItem(option)">
      </Button>
    </template>
    <Button v-if="!last" icon="fas fa-minus" class="p-button-rounded p-button-outlined p-button-danger add-next-delete-button" @click="deleteClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { Enums } from "im-library";
import { ComponentDetails, NextComponentSummary } from "im-library/dist/types/interfaces/Interfaces";
const { ComponentType } = Enums;

export default defineComponent({
  name: "AddNext",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    value: {
      type: Object as PropType<NextComponentSummary>,
      required: true
    },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    addClicked: (_payload: { selectedType: typeof ComponentType; position: number }) => true,
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
    addItem(selectedOption: typeof ComponentType) {
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
        case ComponentType.LOGIC:
          this.options = [ComponentType.LOGIC];
          break;
        case ComponentType.ENTITY:
          this.options = [ComponentType.ENTITY];
          break;
        default:
          console.error("Unhandled component type within parent editor AddNext generateOptions switch");
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
  padding-top: 1rem;
}

.add-next-button {
  border-style: dashed !important;
}
</style>
