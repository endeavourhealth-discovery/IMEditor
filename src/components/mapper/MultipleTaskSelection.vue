<template>
  <Card>
    <template #content>
      <ExpansionTable :contents="tasks" :selectable="true" @select="select" @unselect="unselect" @selectAll="selectAll" @unselectAll="unselectAll" />
    </template>
    <template #footer class="button-bar flex flex-row justify-content-end">
      <div class="button-bar flex flex-row justify-content-end" id="add-to-task-button-bar">
        <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="close" />
        <Button icon="pi pi-folder" label="Add to task" class="p-button-help" @click="addToTask" />
      </div>
    </template>
  </Card>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";

export default defineComponent({
  name: "MultipleTaskSelection",
  components: {
    ExpansionTable
  },
  props: {
    tasks: { type: Array, required: true }
  },
  emits: {
    addToTasks: (_payload: any[]) => true,
    closeTaskDialog: () => true
  },
  data() {
    return {
      tableSelectedList: [] as any[]
    };
  },
  methods: {
    select(tableSelected: any) {
      this.tableSelectedList.push(tableSelected);
    },

    unselect(tableUnselected: any) {
      this.tableSelectedList = this.tableSelectedList.filter(selected => selected.iri !== tableUnselected.iri);
    },

    addToTask() {
      this.$emit("addToTasks", this.tableSelectedList);
    },

    close() {
      this.$emit("closeTaskDialog");
    },

    selectAll(selectedList: any[]) {
      this.tableSelectedList = selectedList;
    },

    unselectAll() {
      this.tableSelectedList = [];
    }
  }
});
</script>

<style scoped>
#add-to-task-button-bar {
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border: none;
  background-color: #ffffff;
}
</style>
