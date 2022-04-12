<template>
  CONFIRMATION
  <div class="button-bar flex flex-row justify-content-end" id="task-definition-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-check" label="Submit" class="save-button" @click="submit" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "TaskSelection",
  emits: ["nextPage", "prevPage"],
  data() {
    return {
      pageIndex: 3
    };
  },
  methods: {
    submit() {
      console.log("submit");
    },
    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, root: {} });
    }
  }
});
</script>

<style scoped></style>
