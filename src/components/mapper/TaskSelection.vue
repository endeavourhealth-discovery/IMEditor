<template>
  <ExpansionTable :contents="tasks" :selectable="true" @select="select" @unselect="unselect" class="table-container" />
  <div class="button-bar flex flex-row justify-content-end" id="mapping-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-check" label="Next" class="save-button" @click="next" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ExpansionTable from "@/components/mapper/ExpansionTable.vue";
import EntityService from "@/services/EntityService";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;
const { IM, RDF, RDFS } = Vocabulary;

export default defineComponent({
  name: "TaskSelection",
  components: { ExpansionTable },
  props: ["data"],
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
      data.children.forEach(async (child: { [x: string]: any; iri: any }) => {
        child.iri = child["@id"];
        const entity = await EntityService.getPartialEntity(child.iri, [IM.MAPPED_TO]);
        child.mappings = [];
        if (isArrayHasLength(entity[IM.MAPPED_TO])) {
          entity[IM.MAPPED_TO].forEach((mappedTo: any) => {
            child.mappings.push({ iri: mappedTo["@id"], name: mappedTo.name });
          });
        }
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

<style scoped>
#mapping-button-bar {
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid #dee2e6;
  border-left: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
}

.table-container {
  height: calc(100vh - 16.3rem);
  overflow: auto;
}
</style>
