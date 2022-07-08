<template>
  <div class="add-next-container">
    <template v-for="option of options" :key="option">
      <Button icon="fa-solid fa-plus" :label="option" class="p-button-rounded p-button-outlined p-button-danger add-next-button" @click="addItem(option)">
      </Button>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { Enums } from "im-library";
import { QueryNextComponentSummary, QueryComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
const { BuilderType, QueryComponentType } = Enums;

export default defineComponent({
  name: "AddNext",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    last: Boolean,
    value: {
      type: Object as PropType<QueryNextComponentSummary>,
      required: true
    },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    addClicked: (_payload: { selectedType: Enums.QueryComponentType; position: number }) => true,
    deleteClicked: (_payload: QueryComponentDetails) => true
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
      options: [] as Enums.QueryComponentType[]
    };
  },
  methods: {
    addItem(selectedOption: Enums.QueryComponentType) {
      this.$emit("addClicked", {
        selectedType: selectedOption,
        position: this.value.previousPosition + 1
      });
    },

    generateOptions(value: QueryNextComponentSummary) {
      switch (value.previousComponentType) {
        case QueryComponentType.LOGIC:
          this.options = [QueryComponentType.MATCH, QueryComponentType.ENTITY_TYPE, QueryComponentType.PROPERTY_GROUP];
          break;
        default:
          console.error("Unhandled component type within query builder AddNext generateOptions switch");
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
