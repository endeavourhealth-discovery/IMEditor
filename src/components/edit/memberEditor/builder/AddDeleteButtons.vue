<template>
  <div v-if="show" class="switch-button-container">
    <div class="buttons-container">
      <Button icon="fas fa-minus" class="p-button-rounded p-button-outlined p-button-danger" @click="deleteClicked" />
      <Button icon="fas fa-plus" class="p-button-rounded p-button-outlined p-button-success" @click="addNextClicked" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@vue/runtime-core";

export default defineComponent({
  name: "AddDeleteButtons",
  props: {
    position: Number,
    show: Boolean
  },
  emits: {
    addNextClicked: () => true,
    deleteClicked: () => true
  },
  methods: {
    addNextClicked() {
      this.$emit("addNextClicked");
    },

    deleteClicked() {
      this.$emit("deleteClicked");
    }
  }
});
</script>

<style scoped>
.switch-button-container {
  order: 2;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
}

.buttons-container {
  display: flex;
  flex-flow: row;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
