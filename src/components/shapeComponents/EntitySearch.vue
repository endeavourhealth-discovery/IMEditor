<template>
  <div class="entity-search-item-container">
    <div class="label-container">
      <InputText
        ref="miniSearchInput"
        type="text"
        v-model="searchTerm"
        @input="debounceForSearch"
        @keyup.enter="search"
        @focus="onFocus"
        @change="showOverlay"
        placeholder="Search"
        class="p-inputtext search-input"
        autoWidth="true"
        v-tooltip="{ value: selectedResult.name, class: 'entity-tooltip' }"
        @dragenter.prevent
        @dragover.prevent
        @drop="dropReceived"
      />
      <Button :disabled="!selectedResult['@id']" icon="fa-solid fa-sitemap" @click="findInTree(selectedResult['@id'])" />
    </div>
  </div>
  <OverlayPanel class="search-op" ref="miniSearchOP" :showCloseIcon="true" :dismissable="true">
    <SearchMiniOverlay :searchTerm="searchTerm" :searchResults="searchResults" :loading="loading" @searchResultSelected="updateSelectedResult" />
  </OverlayPanel>
</template>

<script setup lang="ts">
import { computed, PropType, watch, onMounted, ref, Ref, inject } from "vue";
import SearchMiniOverlay from "@/components/shapeComponents/SearchMiniOverlay.vue";
import EntityMiniTree from "@/components/shapeComponents/EntityMiniTree.vue";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import axios from "axios";
import _ from "lodash";
import {
  Namespace,
  TTIriRef,
  EntityReferenceNode,
  SearchRequest,
  ConceptSummary,
  PropertyShape,
  QueryRequest,
  Query
} from "im-library/dist/types/interfaces/Interfaces";
import { Helpers, Models, Enums, Services, Vocabulary } from "im-library";
import { useStore } from "vuex";
import injectionKeys from "@/injectionKeys/injectionKeys";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys, isObject },
  TypeGuards: { isTTIriRef },
  EditorMethods: { processArguments, getTreeQueryIri },
  Transforms: { mapToObject }
} = Helpers;
const { ComponentType, BuilderType, SortBy } = Enums;
const { EntityService, QueryService } = Services;
const { IM, RDF, RDFS } = Vocabulary;

const store = useStore();

const props = defineProps({
  value: { type: Object as PropType<TTIriRef>, required: false },
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  position: { type: Number, required: false }
});

const emit = defineEmits({
  updateClicked: (_payload: TTIriRef) => true
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMapUpdate = inject(injectionKeys.valueVariableMap)?.updateValueVariableMap;

const entityService = new EntityService(axios);
const queryService = new QueryService(axios);

watch(
  () => _.cloneDeep(props.value),
  async () => {
    await init();
  }
);

onMounted(async () => {
  await init();
});

let loading = ref(false);
let controller: Ref<AbortController> = ref({} as AbortController);
let selectedResult: Ref<TTIriRef> = ref({} as TTIriRef);
let searchTerm = ref("");
let searchResults: Ref<ConceptSummary[]> = ref([]);
let label = ref("");
let key = ref("");
let invalid = ref(false);
let debounce = ref(0);

const miniSearchOP = ref();

async function init() {
  if (isObjectHasKeys(props.shape, ["path"])) key.value = props.shape.path["@id"];
  if (props.value && isObjectHasKeys(props.value, ["name", "@id"])) {
    updateSelectedResult(props.value);
    await search();
  } else {
    selectedResult.value = {} as TTIriRef;
    searchTerm.value = "";
  }
  label.value = props.shape.name;
}

function debounceForSearch(): void {
  clearTimeout(debounce.value);
  debounce.value = window.setTimeout(() => {
    search();
  }, 600);
}

async function search(): Promise<void> {
  if (searchTerm.value.length > 2) {
    loading.value = true;
    let queryRequest = {} as QueryRequest;
    let query = {} as Query;
    if (isObjectHasKeys(props.shape, ["select", "argument"])) {
      const args = processArguments(props.shape);
      const replacedArgs = mapToObject(args);
      queryRequest.argument = replacedArgs;
      queryRequest.textSearch = searchTerm.value;
      query["@id"] = props.shape.select[0]["@id"];
      queryRequest.query = query;
    }
    if (isObjectHasKeys(props.shape, ["select"])) {
      queryRequest.textSearch = searchTerm.value;
      query["@id"] = props.shape.select[0]["@id"];
      queryRequest.query = query;
    }
    if (!isObjectHasKeys(query, ["@id"])) throw new Error("No query iri found for entity search");

    if (!isObject(controller.value)) {
      controller.value.abort();
    }
    controller.value = new AbortController();
    if (controller.value) {
      const result = await queryService.queryIM(queryRequest, controller.value);
      if (result && isObjectHasKeys(result, ["entities"])) {
        searchResults.value = convertToConceptSummary(result.entities);
      } else searchResults.value = [];
    }
    loading.value = false;
  }
}

function convertToConceptSummary(results: any[]) {
  return results.map(result => {
    const conceptSummary = {} as ConceptSummary;
    conceptSummary.iri = result["@id"];
    conceptSummary.name = result[RDFS.LABEL];
    conceptSummary.code = result[IM.CODE];
    conceptSummary.entityType = result[RDF.TYPE];
    conceptSummary.scheme = result[IM.SCHEME];
    conceptSummary.status = result[IM.HAS_STATUS];
    return conceptSummary;
  });
}

function hideOverlay(): void {
  const x = miniSearchOP.value as any;
  if (x) x.hide();
}

function showOverlay(event: any): void {
  const x = miniSearchOP.value as any;
  if (x) x.show(event, event.target);
}

function onFocus(event: any) {
  showOverlay(event);
  const queryTreeIri = getTreeQueryIri(props.shape.select);
  if (queryTreeIri) store.commit("updateΤreeQueryIri", queryTreeIri);
  console.log(queryTreeIri);
}

async function updateSelectedResult(data: ConceptSummary | TTIriRef) {
  if (!isObjectHasKeys(data)) {
    selectedResult.value = {} as TTIriRef;
    searchTerm.value = "";
  } else if (isTTIriRef(data)) {
    selectedResult.value = data;
    searchTerm.value = data.name;
  } else {
    selectedResult.value = { "@id": data.iri, name: data.name };
    searchTerm.value = data.name;
  }
  if (!props.shape.builderChild && key.value) {
    updateEntity();
  } else {
    emit("updateClicked", selectedResult.value);
  }
  await updateValidity();
  updateValueVariableMap(selectedResult.value);
  hideOverlay();
}

function updateEntity() {
  const result = {} as any;
  result[key.value] = selectedResult.value;
  if (entityUpdate && !props.shape.builderChild) entityUpdate(result);
}

function updateValueVariableMap(data: TTIriRef) {
  if (!props.shape.valueVariable) return;
  let mapKey = props.shape.valueVariable;
  if (props.shape.builderChild) mapKey = mapKey + props.shape.order;
  if (valueVariableMapUpdate) valueVariableMapUpdate(mapKey, data);
}

async function updateValidity() {
  if (isObjectHasKeys(props.shape, ["validation"]) && editorEntity) {
    invalid.value = !(await queryService.checkValidation(props.shape.validation["@id"], editorEntity.value));
  } else {
    invalid.value = !defaultValidity();
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidity() {
  return isTTIriRef(selectedResult.value);
}

function findInTree(iri: string) {
  if (iri) store.commit("updateFindInTreeIri", iri);
}

function dropReceived(event: any) {
  const data = event.dataTransfer.getData("text/plain");
  if (data) {
    const json = JSON.parse(data);
    const iriRef = { "@id": json.data, name: json.label };
    updateSelectedResult(iriRef);
  }
}
</script>

<style scoped>
.entity-search-item-container {
  flex: 0 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  max-width: 100%;
}

.label-container {
  flex: 0 1 auto;
  padding: 1rem;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
  display: flex;
  flex-flow: row nowrap;
}

.label {
  cursor: pointer;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  padding: 0.25rem;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}

.search-input {
  width: 25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
