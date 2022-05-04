<template>
  <Dialog header="Updated entities" v-model:visible="displayUpdatedEntities">
    <ExpansionTable v-if="updatedEntities.length" class="mapping-item-container" :contents="updatedEntities" :paginable="true" :expandable="true" />
    <template #footer>
      <Button label="Go to editor" @click="goToEditor" />
      <Button label="Create new task" @click="goToTaskDefinition" />
      <Button label="Select task" @click="goToTaskSelection" />
    </template>
  </Dialog>
  <DataTable :value="mappingsDisplay" responsiveLayout="scroll" class="table-container">
    <Column field="mappedFrom" header="From"><i class="pi pi-arrow-right"></i> </Column>
    <Column><template #body> </template></Column>
    <Column field="mappedTo" header="To">
      <template #body="{data}">
        <table>
          <tr v-for="(mapping, key) in data.mappedTo" :key="key">
            <td>{{ mapping.iri }}</td>
            <td>{{ mapping.name }}</td>
            <td><Button icon="pi pi-times" class="p-button-rounded p-button-danger p-button-text" /></td>
          </tr>
        </table>
      </template>
    </Column>
  </DataTable>

  <div class="button-bar flex flex-row justify-content-end" id="task-definition-button-bar">
    <Button icon="pi pi-times" label="Back" class="p-button-secondary" @click="previous" />
    <Button icon="pi pi-check" label="Submit" class="save-button" @click="submit" />
  </div>
</template>

<script lang="ts">
import EntityService from "@/services/EntityService";
import { defineComponent } from "vue";
import ExpansionTable from "./ExpansionTable.vue";
import { Vocabulary, Helpers, Models, Enums, LoggerService } from "im-library";

const { IM, RDF, RDFS } = Vocabulary;

export default defineComponent({
  name: "TaskSelection",
  props: ["data"],
  emits: ["nextPage", "prevPage"],
  components: {
    ExpansionTable
  },
  data() {
    return {
      pageIndex: 3,
      mappingsMap: new Map<string, any>(),
      mappingsDisplay: [] as any[],
      displayUpdatedEntities: false,
      updatedEntities: [] as any[]
    };
  },
  mounted() {
    this.mappingsMap = Object.assign(this.data);
    this.mappingsMap.forEach((value, key) => {
      this.mappingsDisplay.push({
        mappedFrom: key,
        mappedTo: value
      });
    });
  },
  methods: {
    goToEditor() {
      this.$router.push({ name: "Home" });
      this.displayUpdatedEntities = false;
    },
    goToTaskDefinition() {
      this.$router.push({ name: "TaskDefinition" });
      this.$store.commit("updateRefreshTree");
      this.displayUpdatedEntities = false;
    },
    goToTaskSelection() {
      this.$router.push({ name: "TaskSelection" });
      this.displayUpdatedEntities = false;
    },
    async submit() {
      const mappings = {} as any;
      this.mappingsMap.forEach((value, key) => {
        mappings[key] = value.map((mappedTo: { iri: string }) => mappedTo.iri);
      });
      const updatedEntities = await EntityService.saveMapping(mappings);
      this.updatedEntities = updatedEntities.map(entity => {
        return { iri: entity["@id"], name: entity[RDFS.LABEL], type: entity[RDF.TYPE] };
      });
      this.$toast.add(LoggerService.success("Saved new mappings successfully"));
      this.displayUpdatedEntities = true;
    },
    previous() {
      this.$emit("prevPage", { pageIndex: this.pageIndex, root: {} });
    }
  }
});
</script>

<style scoped>
.table-container {
  height: calc(100vh - 16.3rem);
  overflow: auto;
}

.button-bar {
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid #dee2e6;
  border-left: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
}
</style>
