<template>
  <div class="quantifier-item-container" :id="id">
    <div class="label-container">
      <span class="float-text">Quantifier</span>
      <!-- <div v-if="loading" class="loading-container">
        <ProgressSpinner style="width:1.5rem;height:1.5rem;" strokeWidth="6" />
      </div> -->
      <div class="input-treebutton-container">
        <InputText
          ref="miniSearchInput"
          v-model="searchTerm"
          @input="search"
          @keyup.enter="search"
          @focus="showOverlay"
          @change="showOverlay"
          placeholder="Search"
          :dropdown="true"
          :disabled="invalidAssociatedProperty"
          class="search-input"
        />
        <Button icon="fa-solid fa-sitemap" @click="showTreeDialog($event)" />
      </div>
      <small v-if="invalidAssociatedProperty" class="validate-error">Missing property for refinement. Please select a property first.</small>
    </div>
    <AddDeleteButtons :show="showButtons" :position="position" :options="[]" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
  <OverlayPanel class="search-op" ref="miniSearchOP" :showCloseIcon="true" :dismissable="true">
    <SearchMiniOverlay :searchTerm="searchTerm" :searchResults="searchResults" :loading="loading" @searchResultSelected="updateSelectedResult" />
  </OverlayPanel>
  <OverlayPanel class="tree-op" ref="treeOP" :showCloseIcon="true" :dismissable="true">
    <QuantifierTree :isAs="isAs" :quantifier="selectedResult" @treeNodeSelected="updateSelectedResult" />
  </OverlayPanel>
</template>

<script setup lang="ts">
import { computed, defineComponent, onMounted, PropType, Ref, ref, watch } from "vue";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import axios from "axios";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
import QuantifierTree from "@/components/edit/memberEditor/builder/quantifier/QuantifierTree.vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { mapState, useStore } from "vuex";
import { Vocabulary, Helpers, Enums, Models, Services } from "im-library";
import {
  TTIriRef,
  ComponentDetails,
  Namespace,
  EntityReferenceNode,
  SearchRequest,
  ConceptSummary,
  PropertyShape
} from "im-library/dist/types/interfaces/Interfaces";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys, isObject },
  TypeGuards: { isTTIriRef },
  Sorters: { byName }
} = Helpers;
const { IM, RDFS } = Vocabulary;
const { ComponentType, SortBy } = Enums;
const { QueryService, EntityService } = Services;

const props = defineProps({
  id: { type: String, required: true },
  position: { type: Number, required: true },
  value: { type: Object as PropType<{ propertyIri: string; quantifier: TTIriRef }>, required: true },
  showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  shape: { type: Object as PropType<PropertyShape>, required: true }
});

const emit = defineEmits({
  updateClicked: (_payload: ComponentDetails) => true,
  addNextOptionsClicked: (_payload: any) => true,
  deleteClicked: (_payload: ComponentDetails) => true,
  addClicked: (_payload: any) => true
});

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

const store = useStore();
const filterOptions = computed(() => store.state.filterOptions);
const selectedFilters = computed(() => store.state.selectedFilters);

watch(
  () => props.value,
  async () => {
    await init();
  }
);

let loading = ref(false);
let selectedResult: Ref<TTIriRef> = ref({} as TTIriRef);
let invalidAssociatedProperty = ref(false);
let controller: Ref<AbortController> = ref({} as AbortController);
let isAs: Ref<string[]> = ref([]);
let searchTerm = ref("");
let searchResults: Ref<ConceptSummary[]> = ref([]);

watch(selectedResult, (newValue, oldValue) => {
  if (newValue && JSON.stringify(newValue) !== JSON.stringify(oldValue) && newValue["@id"]) onConfirm();
});

const miniSearchOP = ref();
const treeOP = ref();

onMounted(async () => {
  await init();
});

async function init() {
  loading.value = true;
  if (props.value.propertyIri) {
    invalidAssociatedProperty.value = false;
    const query = createQuantifierOptionsQuery(props.value.propertyIri);
    const queryResult = await queryService.queryIM(query);
    if (isObjectHasKeys(queryResult, ["entities", "@context"]) && isArrayHasLength(queryResult.entities)) {
      isAs.value = queryResult.entities.map(result => result["@id"]);
    }
    if (isArrayHasLength(isAs.value)) {
      if (props.value && isTTIriRef(props.value.quantifier)) {
        searchTerm.value = props.value.quantifier.name;
        await search();
        const found = searchResults.value.find(item => item.iri === props.value.quantifier["@id"]);
        if (found) selectedResult.value = { "@id": found.iri, name: found.name };
      }
    }
  } else {
    invalidAssociatedProperty.value = true;
  }
  loading.value = false;
}

function hideOverlay(): void {
  const x = miniSearchOP.value as any;
  if (x) x.hide();
}

function showOverlay(event: any): void {
  const x = miniSearchOP.value as any;
  if (x) x.show(event, event.target);
}

function showTreeDialog(event: any): void {
  const x = treeOP.value as any;
  if (x) x.show(event, event.target);
}

function hideTreeOverlay(): void {
  const x = treeOP as any;
  if (x) x.hide();
}

function updateSelectedResult(data: ConceptSummary | TTIriRef) {
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
  onConfirm();
  hideOverlay();
  hideTreeOverlay();
}

function createQuantifierOptionsQuery(iri: string) {
  return {
    name: "Ranges for finding site",
    description: "retrieves the high level concepts allowable as values of the attribute finding side",
    activeOnly: true,
    resultFormat: "OBJECT",
    select: {
      property: [
        {
          "@id": "http://endhealth.info/im#id"
        },
        {
          "@id": "http://www.w3.org/2000/01/rdf-schema#label"
        }
      ],
      match: {
        property: {
          "@id": "http://www.w3.org/2000/01/rdf-schema#range"
        },
        inverseOf: true,
        isConcept: [
          {
            includeSupertypes: true,
            "@id": iri
          }
        ]
      }
    }
  };
}

async function search() {
  if (searchTerm.value.length > 0) {
    loading.value = true;
    searchResults.value = [];
    const searchRequest = {} as SearchRequest;
    searchRequest.termFilter = searchTerm.value;
    searchRequest.isA = isAs.value;
    setFilters(searchRequest);
    if (!isObject(controller.value)) {
      controller.value.abort();
    }
    controller.value = new AbortController();
    const result = await entityService.advancedSearch(searchRequest, controller.value);
    if (isArrayHasLength(result)) {
      searchResults.value = result;
    }
    loading.value = false;
  }
}

function setFilters(searchRequest: SearchRequest) {
  const typeOptions = filterOptions.value.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT || type["@id"] === IM.CONCEPT_SET);
  const filteredFilterOptions = { status: filterOptions.value.status, schemes: filterOptions.value.schemes, types: typeOptions };

  searchRequest.schemeFilter = filteredFilterOptions.schemes.map((scheme: Namespace) => scheme.iri);

  searchRequest.statusFilter = [];
  for (const status of filteredFilterOptions.status) {
    if (status["@id"] === IM.ACTIVE) searchRequest.statusFilter.push(status["@id"]);
  }

  searchRequest.typeFilter = [];
  for (const type of filteredFilterOptions.types) {
    searchRequest.typeFilter.push(type["@id"]);
  }
}

function createQuantifier(): ComponentDetails {
  return {
    value: createAsJson(),
    id: props.id,
    position: props.position,
    type: ComponentType.QUANTIFIER,
    json: selectedResult.value,
    shape: props.shape,
    showButtons: props.showButtons,
    mode: props.mode
  };
}

function onConfirm() {
  emit("updateClicked", createQuantifier());
}

function createAsJson() {
  return { quantifier: selectedResult.value, propertyIri: props.value.propertyIri };
}

function deleteClicked(): void {
  emit("deleteClicked", createQuantifier());
}

function addNextClicked(): void {
  emit("addNextOptionsClicked", {
    selectedType: ComponentType.QUANTIFIER,
    position: props.position + 1
  });
}
</script>

<style scoped>
.quantifier-item-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  width: 50%;
}

.loading-container {
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
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

.input-treebutton-container {
  display: flex;
  flex-flow: row nowrap;
  width: 100%;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
  padding: 0 0 0.25rem 0;
}
</style>
