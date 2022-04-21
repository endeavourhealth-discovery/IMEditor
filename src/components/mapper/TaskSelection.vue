<template>
  <div>
    <ExpansionTable :contents="tasks" :selectable="true" @select="select" unselect="unselect" />
  </div>
  <div class="button-bar flex flex-row justify-content-end" id="task-definition-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";
import EntityService from "@/services/EntityService";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
const { IM, RDF, RDFS } = Vocabulary;

export default defineComponent({
  name: "TaskSelection",
  components: { ExpansionTable },
  emits: ["nextPage", "prevPage"],
  data() {
    return {
      pageIndex: 1,
      tasks: [] as any[],
      selectedTasks: [] as any[]
    };
  },
  async mounted() {
    this.tasks = (await EntityService.getEntityChildren(IM.MODULE_TASKS)) as any[];
    this.tasks.forEach(task => {
      task.iri = task["@id"];
    });
  },
  methods: {
    select(data: any) {
      this.selectedTasks.push(data);
    },
    unselect(data: any) {
      const i = this.selectedTasks.indexOf((task: any) => task.iri === data.iri);
      this.selectedTasks.splice(i, 1);
    },
    async getTaskActions(data: any) {
      data.children = await EntityService.getEntityChildren(data.iri);
      data.children.forEach((child: { [x: string]: any; iri: any }) => {
        child.iri = child["@id"];
      });
    },
    next() {
      this.selectedTasks.forEach(async selected => {
        await this.getTaskActions(selected);
      });
      this.$emit("nextPage", { pageIndex: this.pageIndex, data: this.selectedTasks });
    },
    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, data: this.selectedTasks });
    }
  }
});
</script>

<style scoped></style>
