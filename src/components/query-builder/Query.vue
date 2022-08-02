<template>
  <div id="topbar-query-container">
    <TopBar>
      <template #content>
        <div class="topbar-content">
          <span class="title"><strong>IM QueryBuilder:</strong></span>
        </div>
      </template>
    </TopBar>
    <ConfirmDialog></ConfirmDialog>
    <div id="query-main-container">
      <div class="loading-container" v-if="loading">
        <ProgressSpinner />
      </div>
      <div v-else class="content-buttons-container">
        <div class="content-json-container">
          <div class="content">
            <div class="panel-content" id="query-builder-container">
              <ul>
                <TreeItem class="item" :model="treeData" @updateQuery="updateQuery"></TreeItem>
              </ul>
            </div>
          </div>
          <Divider v-if="showJson" layout="vertical" />
          <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>
            <VueJsonPretty v-if="isObjectHasKeys(queryDisplay)" class="json" :data="queryDisplay" />
          </div>
          <!-- <div v-if="showJson" class="json-container">
            <div class="json-header-container">
              <span class="json-header">JSON viewer</span>
            </div>
            <VueJsonPretty v-if="isObjectHasKeys(treeData)" class="json" :data="treeData" />
          </div> -->
          <!-- <Button
            class="p-button-rounded p-button-info p-button-outlined json-toggle"
            :label="showJson ? 'hide JSON' : 'show JSON'"
            @click="showJson = !showJson"
          /> -->
        </div>
        <Dialog
          header="Query results"
          v-model:visible="displayResults"
          :maximizable="true"
          :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
          :style="{ width: '50vw' }"
        >
          <VueJsonPretty v-if="isObjectHasKeys(queryResults)" class="json" :data="queryResults" />
          <template #footer>
            <Button label="OK" @click="displayResults = false" />
          </template>
        </Dialog>
        <div class="button-bar" id="query-button-bar">
          <Button icon="pi pi-times" label="Cancel" class="p-button-secondary" @click="$router.go(-1)" />
          <Button icon="pi pi-refresh" label="Reset" class="p-button-warning" @click="refresh" />
          <Button icon="pi pi-play" label="Run" class="p-button-help" @click="runQuery" />
          <Button icon="pi pi-check" label="Save" class="save-button" @click="submit" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import VueJsonPretty from "vue-json-pretty";
import { Helpers, Services } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
import { defineComponent } from "@vue/runtime-core";
import TreeItem from "./TreeItem.vue";
import { buildQueryFromTreeItem } from "./QueryBuilder";
import treeData from "./TreeData";
import axios from "axios";
import { ITreeItem } from "./TreeItem";

export default defineComponent({
  components: {
    TreeItem,
    VueJsonPretty
  },
  data() {
    return {
      showJson: true,
      loading: false,
      displayResults: false,
      treeData: {
        key: 0,
        name: "select",
        type: "PROPERTY",
        valueType: "OBJECT",
        componentType: "DISPLAY"
      } as ITreeItem,
      // treeData: treeData as ITreeItem,
      queryResults: {},
      queryDisplay: {}
    };
  },
  mounted() {
    this.updateQuery();
  },
  methods: {
    updateQuery() {
      this.queryDisplay = buildQueryFromTreeItem(this.treeData);
    },
    isObjectHasKeys(data: any) {
      return isObjectHasKeys(data);
    },
    async runQuery() {
      this.queryResults = await axios.post(Services.Env.API + "api/query/public/queryIM", this.queryDisplay);
      this.displayResults = true;
    },
    submit() {
      console.log("submit");
    },
    refresh() {
      location.reload();
    }
  }
});
</script>

<style>
.item {
  cursor: pointer;
  line-height: 1.5;
}
.bold {
  font-weight: bold;
}

#topbar-query-container {
  height: 100%;
  width: 100%;
  overflow: auto;
}

#query-main-container {
  width: 100%;
  height: calc(100% - 3.5rem);
  overflow: auto;
  background-color: #ffffff;
}

.content-buttons-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
  overflow: auto;
}

.loading-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
}

.content-json-container {
  flex: 1 1 auto;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  overflow: auto;
  position: relative;
}

.json-container {
  width: 50vw;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
}

.content {
  flex: 1 1 auto;
  height: 100%;
  overflow: auto;
}

.json {
  flex: 0 1 auto;
  width: 100%;
  overflow: auto;
  border: 1px #dee2e6 solid;
  border-radius: 3px;
}

.json-header-container {
  padding: 0.5rem;
  height: 3rem;
  flex: 0 0 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.json-header {
  font-size: 1.5rem;
}

.json:deep(.vjs-value__string) {
  word-break: break-all;
}

.json:deep(.vjs-value) {
  font-size: 1rem;
}

.json:deep(.vjs-key) {
  font-size: 1rem;
}

.placeholder {
  height: 100%;
}

.title {
  font-size: 2rem;
  white-space: nowrap;
}

#query-button-bar {
  flex: 0 1 auto;
  padding: 1rem 1rem 1rem 0;
  gap: 0.5rem;
  width: 100%;
  border-bottom: 1px solid #dee2e6;
  border-left: 1px solid #dee2e6;
  border-right: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  display: flex;
  flex-flow: row;
  justify-content: flex-end;
}

.topbar-content {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.p-divider {
  height: calc(100% - 2rem) !important;
  min-height: unset !important;
  align-self: center;
}

.json-toggle {
  position: absolute;
  top: 5px;
  right: 5px;
}

#query-builder-container {
  display: flex;
  flex-flow: column;
  justify-content: flex-start;
  align-items: center;
}
</style>
