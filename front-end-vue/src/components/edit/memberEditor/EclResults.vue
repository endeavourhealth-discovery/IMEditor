<template>
  <div id="ecl-results-container" class="p-field">
    <div v-if="loading" class="flex flex-row justify-content-center">
      <div class="p-text-center">
        <ProgressSpinner />
      </div>
    </div>
    <DataTable
      v-else
      :value="results"
      v-model:selection="selectedResult"
      @row-select="onNodeSelect"
      selectionMode="single"
      class="p-datatable-sm"
      :scrollable="true"
      removableSort
      :paginator="true"
      paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
      :rowsPerPageOptions="[15, 25, 50]"
      currentPageReportTemplate="Displaying {first} to {last} of {totalRecords} results"
      :rows="15"
      @page="scrollToTop"
    >
      <template #empty>
        None
      </template>
      <template #loading>
        Loading...
      </template>
      <Column field="name" header="Results">
        <template #body="slotProps">
          <div class="result-container" @mouseenter="showOverlay($event, slotProps.data)" @mouseleave="hideOverlay()">
            <!-- <div class="result-icon-container" :style="getColorByConceptType(slotProps.data.entityType)">
              <font-awesome-icon :icon="getPerspectiveByConceptType(slotProps.data.entityType)" class="result-icon fa-fw" />
            </div> -->
            <div class="result-text-container">
              {{ slotProps.data.name }}<br />
              <small style="color:lightgrey">{{ slotProps.data.name }}</small>
            </div>
            <!-- <div class="button-container">
              <Button
                icon="pi pi-copy"
                class="p-button-rounded p-button-text p-button-secondary"
                v-clipboard:copy="copyConceptToClipboardVueWrapper(slotProps.data)"
                v-clipboard:success="onCopy"
                v-clipboard:error="onCopyError"
                v-tooltip.right="'Copy concept summary to clipboard \n (right click to copy individual properties)'"
                @contextmenu="onCopyRightClick"
              />
            </div> -->
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- <ContextMenu ref="copyMenu" :model="copyMenuItems" /> -->

    <OverlayPanel ref="op" id="overlay-panel" style="width: 25vw" :dismissable="true">
      <div class="result-overlay">
        <div class="left-side" v-if="hoveredResult.iri">
          <p>
            <strong>Name: </strong>
            <span>
              {{ hoveredResult.name }}
            </span>
          </p>
          <p>
            <strong>Iri: </strong>
            <span style="word-break:break-all;">
              {{ hoveredResult.iri }}
            </span>
          </p>
        </div>
        <div class="right-side" v-if="hoveredResult.iri">
          <!-- <p>
            <strong>Status: </strong>
            <span v-if="hoveredResult.status">
              {{ hoveredResult.status.name }}
            </span>
          </p> -->
          <p>
            <strong>Code: </strong>
            <span>
              {{ hoveredResult.code }}
            </span>
          </p>
          <p>
            <strong>Scheme: </strong>
            <span v-if="hoveredResult.scheme">
              {{ hoveredResult.scheme.name }}
            </span>
          </p>
          <!-- <p>
            <strong>Type: </strong>
            <span>
              {{ getConceptTypes(hoveredResult) }}
            </span>
          </p> -->
        </div>
      </div>
    </OverlayPanel>
  </div>
</template>

<script lang="ts">
import { SimpleMapIri } from "im-library/src/interfaces/Interfaces";
import { defineComponent, PropType } from "@vue/runtime-core";

export default defineComponent({
  name: "EclResults",
  props: { results: { type: Array as PropType<Array<SimpleMapIri>>, required: true }, loading: { type: Boolean, required: true } },
  data() {
    return {
      selectedResult: {} as SimpleMapIri,
      hoveredResult: {} as SimpleMapIri
    };
  },
  methods: {
    onNodeSelect(): void {
      this.$router.push({ name: "Concept", params: { selectedIri: this.selectedResult.iri } });
    },

    scrollToTop(): void {
      const resultsContainer = document.getElementById("ecl-results-container") as HTMLElement;
      const scrollBox = resultsContainer.getElementsByClassName("p-datatable-wrapper")[0] as HTMLElement;
      if (scrollBox) {
        scrollBox.scrollTop = 0;
      }
    },

    hideOverlay(): void {
      const x = this.$refs.op as any;
      x.hide();
    },

    showOverlay(event: any, data: SimpleMapIri): void {
      this.hoveredResult = data;
      const x = this.$refs.op as any;
      x.show(event, event.target);
    }
  }
});
</script>

<style scoped>
#ecl-results-container {
  flex-grow: 5;
  overflow-y: auto;
}

#ecl-results-container ::v-deep(.p-datatable) {
  height: 100%;
  display: flex;
  flex-flow: column;
  justify-content: space-between;
}

#ecl-results-container ::v-deep(.p-datatable-wrapper) {
  flex-grow: 6;
}

.result-container {
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.result-icon-container {
  height: 100%;
  margin-right: 1em;
}

.result-text-container {
  height: fit-content;
  flex-grow: 10;
}

.result-icon {
  font-size: 2.5rem;
  padding: 5px;
}

#overlay-panel:hover {
  transition-delay: 2s;
}

@media screen and (min-width: 1024px) {
  .result-overlay {
    display: flex;
    flex-flow: row;
    justify-content: flex-start;
    width: 100%;
    gap: 7px;
  }

  .left-side,
  .right-side {
    max-width: 50%;
    flex-grow: 2;
  }

  .button-container {
    display: flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
    width: fit-content;
  }
}

@media screen and (max-width: 1023px) {
  .result-overlay {
    display: flex;
    flex-flow: column;
    justify-content: flex-start;
    width: 100%;
    gap: 7px;
  }

  .left-side,
  .right-side {
    width: 100%;
    flex-grow: 2;
  }

  .button-container {
    display: flex;
    flex-flow: row;
    justify-content: center;
    align-items: center;
    width: 100%;
  }
}
</style>
