<template>
  <DataTable
    :value="contents"
    v-model:selection="selected"
    v-model:expandedRows="expandedRows"
    dataKey="iri"
    responsiveLayout="scroll"
    @rowExpand="onRowExpand"
    @dragstart="startDrag"
    @row-select="onRowSelect"
    @row-unselect="onRowUnselect"
    :reorderableColumns="false"
    :paginator="paginable"
    :rows="20"
  >
    <template v-if="inputSearch" #header>
      <div class="flex justify-content-end">
        <span class="p-input-icon-left ">
          <i class="pi pi-search" />
          <InputText v-model="searchTerm" type="text" placeholder="Search" @input="search" />
        </span>
      </div>
    </template>
    <Column v-if="drag" :rowReorder="true" headerStyle="width: 3rem" />
    <Column v-if="selectable" selectionMode="multiple" headerStyle="width: 3em" />
    <Column v-if="expandable" :expander="true" headerStyle="width: 3rem" />
    <Column field="name" header="Name">
      <template #body="{data}">
        <span :style="'color: ' + getColourFromType(data.type)" class="p-mx-1 type-icon">
          <font-awesome-icon :icon="getFAIconFromType(data.type)" />
        </span>
        <span>{{ data.name }}</span>
      </template>
    </Column>
    <Column field="iri" header="Iri">
      <template #body="{data}">
        {{ data.iri }}
      </template>
    </Column>

    <template #expansion="{data}">
      <VueJsonPretty class="suggestion-json" :data="data.expandView" />
    </template>
  </DataTable>
</template>

<script lang="ts">
import EntityService from "@/services/EntityService";
import { defineComponent } from "vue";
import VueJsonPretty from "vue-json-pretty";
import { Vocabulary, Helpers, Models, Enums } from "im-library";

const {
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight }
} = Helpers;

export default defineComponent({
  name: "ExpansionTable",
  props: ["contents", "selectable", "inputSearch", "paginable", "drag", "expandable"],
  emits: ["search", "startDrag", "select", "unselect"],
  components: {
    VueJsonPretty
  },
  data() {
    return {
      selected: [] as any[],
      expandedRows: [] as any[],
      searchTerm: ""
    };
  },
  methods: {
    getColourFromType(type: any) {
      return getColourFromType(type);
    },
    getFAIconFromType(type: any) {
      return getFAIconFromType(type);
    },
    async onRowExpand(event: any) {
      event.data.expandView = await EntityService.getPartialEntity(event.data.iri, []);
    },
    search() {
      this.$emit("search", this.searchTerm);
    },

    startDrag(event: any) {
      const rowString = event.srcElement.innerText as string;
      const data = rowString.split("\t");
      const found = this.contents.find((content: any) => content.iri === data[3]);
      this.$emit("startDrag", found);
    },

    onRowSelect(event: any) {
      this.$emit("select", event.data);
    },

    onRowUnselect(event: any) {
      this.$emit("unselect", event.data);
    }
  }
});
</script>

<style scoped>
.type-icon {
  padding-right: 0.5rem;
}

.drag-el {
  background-color: #fff;
  /* margin-bottom: 10px; */
  /* padding: 5px; */
  cursor: pointer;
}
.drag-el:hover {
  background-color: #6c757d;
  color: #ffffff;
}
</style>
