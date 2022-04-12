<template>
  {{ data }}
  <div class="button-bar flex flex-row justify-content-end" id="task-definition-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "EntityMatcher",
  emits: ["nextPage", "prevPage"],
  props: ["data"],
  data() {
    return {
      pageIndex: 2
    };
  },
  methods: {
    next() {
      this.$emit("nextPage", { pageIndex: this.pageIndex, root: {} });
    },
    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, root: {} });
    }
  }
});
</script>

<style scoped></style>
