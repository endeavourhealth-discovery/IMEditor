<template>
  <div v-if="loading" class="flex flex-row justify-content-center align-items-center loading-container">
    <ProgressSpinner />
  </div>
  <DataTable
    v-else
    :value="contents"
    v-model:selection="selected"
    v-model:expandedRows="expandedRows"
    dataKey="iri"
    responsiveLayout="scroll"
    @rowExpand="onRowExpand"
    @dragstart="startDrag"
    @row-select="onRowSelect"
    @row-unselect="onRowUnselect"
    @row-select-all="rowSelectAll"
    @row-unselect-all="rowUnselectAll"
    :reorderableColumns="false"
    :paginator="paginable"
    :rows="rows || 18"
    :loading="loading"
    class="p-datatable-sm"
    v-model:filters="filters"
    filterDisplay="menu"
  >
    <template #empty> No records found. </template>
    <template #loading> Loading data. Please wait. </template>
    <template #header>
      <div class="flex justify-content-center align-items-center">
        <h5 class="m-0">{{ title }}</h5>
        <span v-if="inputSearch" class="p-input-icon-left">
          <i class="pi pi-search" />
          <InputText v-model="searchTerm" type="text" placeholder="Search" @input="search" />
        </span>
      </div>
    </template>
    <Column v-if="drag" :rowReorder="true" headerStyle="width: 3rem" />
    <Column v-if="selectable" selectionMode="multiple" headerStyle="width: 3em" />
    <Column field="name" header="Name">
      <template #body="{ data }">
        <span :style="'color: ' + getColourFromType(data.type)" class="p-mx-1 type-icon">
          <i :class="getFAIconFromType(data.type)" aria-hidden="true" />
        </span>
        <span>{{ data.name }}</span>
      </template>
    </Column>
    <Column field="iri" header="Iri">
      <template #body="{ data }">
        {{ data.iri }}
      </template>
    </Column>
    <Column v-if="showActions" :exportable="false" bodyStyle="text-align: center; overflow: visible; justify-content: flex-end; gap: 0.25rem;">
      <template #body="{ data }">
        <Button icon="pi pi-fw pi-eye" class="p-button-rounded p-button-text p-button-plain row-button" @click="view(data.iri)" v-tooltip.top="'View'" />
        <Button
          icon="pi pi-fw pi-info-circle"
          class="p-button-rounded p-button-text p-button-plain row-button"
          @click="showInfo(data.iri)"
          v-tooltip.top="'Info'"
        />
        <Button
          icon="pi pi-fw pi-play"
          class="p-button-rounded p-button-text p-button-plain row-button"
          @click="starMapping(data.iri)"
          v-tooltip.left="'Start task'"
        />
      </template>
    </Column>

    <Column v-if="removableRows" headerStyle="width: 3rem">
      <template #body="{ data }">
        <Button icon="pi pi-times" class="p-button-rounded p-button-danger p-button-text" @click="remove(data)" />
      </template>
    </Column>
  </DataTable>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import VueJsonPretty from "vue-json-pretty";
import { Vocabulary, Helpers, Models, Enums } from "im-library";
import DirectService from "@/services/DirectService";
import { FilterMatchMode } from "primevue/api";
import { mapState } from "vuex";

const {
  ConceptTypeMethods: { isValueSet, getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight }
} = Helpers;

export default defineComponent({
  name: "ExpansionTable",
  props: {
    contents: { type: Array, required: true },
    title: { type: String, required: false },
    loading: { type: Boolean, required: false },
    selectable: { type: Boolean, required: false },
    inputSearch: { type: Boolean, required: false },
    paginable: { type: Boolean, required: false },
    rows: { type: Number, required: false },
    drag: { type: Boolean, required: false },
    removableRows: { type: Boolean, required: false },
    showActions: { type: Boolean, required: false }
  },
  emits: {
    search: (_payload: string) => true,
    startDrag: (_payload: any) => true,
    select: (_payload: any) => true,
    unselect: (_payload: any) => true,
    remove: (_payload: any) => true,
    selectAll: (_payload: any) => true,
    unselectAll: () => true,
    showDetails: (_payload: string) => true
  },
  components: {
    VueJsonPretty
  },
  computed: {
    ...mapState(["filterOptions"])
  },
  data() {
    return {
      selected: [] as any[],
      expandedRows: [] as any[],
      searchTerm: "",
      filters: { scheme: { value: null, matchMode: FilterMatchMode.IN } }
    };
  },
  methods: {
    view(iri: string) {
      DirectService.directTo(this.$env.VIEWER_URL, iri, this, "concept");
    },

    showInfo(iri: string) {
      this.$emit("showDetails", iri);
    },

    starMapping(iri: string) {
      this.$router.push({ name: "Mapper", params: { taskIri: iri } });
    },

    remove(data: any) {
      this.$emit("remove", data);
    },
    getColourFromType(type: any) {
      return getColourFromType(type);
    },
    getFAIconFromType(type: any) {
      return getFAIconFromType(type);
    },
    async onRowExpand(event: any) {
      event.data.expandView = await this.$entityService.getPartialEntity(event.data.iri, []);
    },
    search() {
      this.$emit("search", this.searchTerm);
    },

    startDrag(event: any) {
      const rowString = event.srcElement.innerText as string;
      const data = rowString.split("\t");
      const found = this.contents.find((content: any) => content.iri === data[data.length - 1]);
      this.$emit("startDrag", found);
    },

    onRowSelect(event: any) {
      this.$emit("select", event.data);
    },

    onRowUnselect(event: any) {
      this.$emit("unselect", event.data);
    },

    rowSelectAll(event: any) {
      this.$emit("selectAll", event.data);
    },

    rowUnselectAll() {
      this.$emit("unselectAll");
    }
  }
});
</script>

<style scoped>
.type-icon {
  padding-right: 0.5rem;
}
</style>
