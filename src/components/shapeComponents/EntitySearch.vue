<template>
  <div class="entity-search-item-container">
    <div class="label-container">
      <span class="float-text">{{ label }}</span>
      <InputText
        ref="miniSearchInput"
        type="text"
        v-model="searchTerm"
        @input="search"
        @keyup.enter="search"
        @focus="showOverlay"
        @change="showOverlay"
        placeholder="Search"
        class="p-inputtext search-input"
        autoWidth="true"
        v-tooltip="{ value: selectedResult.name, class: 'entity-tooltip' }"
      />
    </div>
  </div>
  <OverlayPanel class="search-op" ref="miniSearchOP" :showCloseIcon="true" :dismissable="true">
    <SearchMiniOverlay :searchTerm="searchTerm" :searchResults="searchResults" :loading="loading" @searchResultSelected="updateSelectedResult" />
  </OverlayPanel>
</template>

<script setup lang="ts">
import { computed, PropType, watch, onMounted, ref, Ref, inject } from "vue";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
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
  QueryRequest
} from "im-library/dist/types/interfaces/Interfaces";
import { Helpers, Models, Enums, Services } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys, isObject },
  TypeGuards: { isTTIriRef },
  EditorMethods: { processArguments },
  Transforms: { mapToObject }
} = Helpers;
const { ComponentType, BuilderType, SortBy } = Enums;
const { EntityService, QueryService } = Services;

const props = defineProps({
  value: { type: Object as PropType<TTIriRef>, required: false },
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true }
});

const emit = defineEmits({
  updateClicked: (_payload: TTIriRef) => true
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

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

//function debounceForSearch(): void {
//   clearTimeout(this.debounce);
//   debounce.value = window.setTimeout(() => {
//     search();
//   }, 600);
// }

//function checkKey(event: any) {
//   if (event.code === "Enter") {
//     search();
//   }
// }

async function search(): Promise<void> {
  if (searchTerm.value.length > 0) {
    loading.value = true;
    let query = {} as QueryRequest;
    if (isObjectHasKeys(props.shape, ["select", "argument"])) {
      const args = processArguments(props.shape);
      const replacedArgs = mapToObject(args);
      query.argument = replacedArgs;
      query.textSearch = searchTerm.value;
      query.queryIri = props.shape.select[0];
    }
    if (isObjectHasKeys(props.shape, ["select"])) {
      query.textSearch = searchTerm.value;
      query.queryIri = props.shape.select[0];
    }
    if (!isObjectHasKeys(query, ["queryIri"])) throw new Error("No queryIri found for entity search");

    if (!isObject(controller.value)) {
      controller.value.abort();
    }
    controller.value = new AbortController();
    if (controller.value) {
      const result = await queryService.entityQuery(query, controller.value);
      if (result)
        searchResults.value = result.map((item: any) => {
          return { "@id": item.iri, name: item.name };
        });
      else searchResults.value = [];
    }
    loading.value = false;
  }
}

function hideOverlay(): void {
  const x = miniSearchOP.value as any;
  if (x) x.hide();
}

function showOverlay(event: any): void {
  const x = miniSearchOP.value as any;
  if (x) x.show(event, event.target);
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
  if (key.value) {
    updateEntity();
    await updateValidity();
  } else {
    emit("updateClicked", selectedResult.value);
  }
  hideOverlay();
}

function updateEntity() {
  const result = {} as any;
  result[key.value] = selectedResult.value;
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity() {
  if (isObjectHasKeys(props.shape, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(selectedResult.value, props.shape.validation["@id"]));
  } else {
    invalid.value = !defaultValidity();
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidity() {
  return isTTIriRef(selectedResult.value);
}
</script>

<style scoped>
.entity-search-item-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.label-container {
  flex: 1 1 auto;
  padding: 1rem;
  border: 1px solid #ffc952;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
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
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
