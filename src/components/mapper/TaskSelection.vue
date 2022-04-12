<template>
  <div>
    <ExpansionTable :contents="data" :selectable="true" @select="select" unselect="unselect" />
  </div>
  <div class="button-bar flex flex-row justify-content-end" id="task-definition-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";

export default defineComponent({
  name: "TaskSelection",
  components: { ExpansionTable },
  emits: ["nextPage", "prevPage"],
  props: ["data"],
  data() {
    return {
      pageIndex: 1,
      selectedTasks: [] as any[]
    };
  },
  methods: {
    select(data: any) {
      this.selectedTasks.push(data);
    },
    unselect(data: any) {
      const i = this.selectedTasks.indexOf((task: any) => task.iri === data.iri);
      this.selectedTasks.splice(i, 1);
    },
    next() {
      this.$emit("nextPage", { pageIndex: this.pageIndex, data: this.selectedTasks });
    },
    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, data: this.selectedTasks });
    }
  }
});
</script>

<style scoped></style>
