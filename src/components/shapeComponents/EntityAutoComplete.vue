<template>
  <div class="autocomplete-container">
    <div class="label-container">
      <span class="float-text">{{ shape.name }}</span>
      <!-- <div v-if="loading" class="loading-container">
        <ProgressSpinner style="width:1.5rem;height:1.5rem;" strokeWidth="6" />
      </div> -->
      <div class="input-treebutton-container">
        <AutoComplete
          ref="miniSearchInput"
          v-model="selectedResult"
          :suggestions="autocompleteOptions"
          @complete="searchOptions($event)"
          :dropdown="true"
          field="name"
          forceSelection
          placeholder="Search"
          :disabled="invalidAssociatedProperty"
          class="search-input"
          @drop.prevent
        >
          <template #item="slotProps">
            <div class="autocomplete-option" @mouseenter="showOptionsOverlay($event, slotProps.item)" @mouseleave="hideOptionsOverlay($event)">
              <span>{{ slotProps.item.name }}</span>
            </div>
          </template>
        </AutoComplete>
        <Button :disabled="!selectedResult" icon="fa-solid fa-sitemap" @click="showTreeDialog($event)" />
      </div>
      <small v-if="invalidAssociatedProperty" class="validate-error">Missing property for refinement. Please select a property first.</small>
    </div>
  </div>
  <OverlayPanel class="options-op" ref="optionsOP" :showCloseIcon="true" :dismissable="true" stype="width: 50vw" :breakpoints="{ '960px': '75vw' }">
    <div v-if="hoveredResult.name" class="flex flex-row justify-contents-start result-overlay" style="width: 100%; gap: 1rem">
      <div class="left-side" style="width: 50%">
        <p>
          <strong>Name: </strong>
          <span>{{ hoveredResult.name }}</span>
        </p>
        <p>
          <strong>Iri: </strong>
          <span style="word-break: break-all">{{ hoveredResult.iri }}</span>
        </p>
        <p v-if="hoveredResult.code">
          <strong>Code: </strong>
          <span>{{ hoveredResult.code }}</span>
        </p>
      </div>
      <div class="right-side" style="width: 50%">
        <p v-if="hoveredResult.status">
          <strong>Status: </strong>
          <span>{{ hoveredResult.status.name }}</span>
        </p>
        <p v-if="hoveredResult.scheme">
          <strong>Scheme: </strong>
          <span>{{ hoveredResult.scheme.name }}</span>
        </p>
        <p v-if="hoveredResult.entityType">
          <strong>Type: </strong>
          <span>{{ getNamesAsStringFromTypes(hoveredResult.entityType) }}</span>
        </p>
      </div>
    </div>
  </OverlayPanel>
  <!-- <OverlayPanel class="tree-op" ref="treeOP" :showCloseIcon="true" :dismissable="true">
    <QuantifierTree :isAs="isAs" :quantifier="selectedResult" @treeNodeSelected="updateSelectedResult" />
  </OverlayPanel> -->
</template>

<script setup lang="ts">
import { PropType, watch, ref, Ref, onMounted, inject, onBeforeUnmount } from "vue";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import axios from "axios";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
import QuantifierTree from "@/components/edit/memberEditor/builder/quantifier/QuantifierTree.vue";
import _ from "lodash";
import { Vocabulary, Helpers, Enums, Models, Services } from "im-library";
import {
  TTIriRef,
  ComponentDetails,
  Namespace,
  EntityReferenceNode,
  SearchRequest,
  ConceptSummary,
  PropertyShape,
  QueryRequest
} from "im-library/dist/types/interfaces/Interfaces";
import injectionKeys from "@/injectionKeys/injectionKeys";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys, isObject },
  TypeGuards: { isTTIriRef },
  Sorters: { byName },
  EditorMethods: { processArguments },
  Transforms: { mapToObject },
  ConceptTypeMethods: { getNamesAsStringFromTypes }
} = Helpers;
const { IM, RDFS } = Vocabulary;
const { ComponentType, SortBy } = Enums;
const { EntityService, QueryService } = Services;

const props = defineProps({
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Object as PropType<TTIriRef>, required: false }
});

watch(
  () => _.cloneDeep(props.value),
  async () => {
    await init();
  }
);

const emit = defineEmits({
  updateClicked: (_payload: TTIriRef) => true
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMap = inject(injectionKeys.valueVariableMap);

watch(
  () => _.cloneDeep(valueVariableMap?.value),
  async () => {
    await init();
  }
);

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

const miniSearchOP = ref();
const treeOP = ref();
const optionsOP = ref();

onMounted(async () => {
  await init();
});

let loading = ref(false);
let selectedResult: Ref<ConceptSummary | undefined> = ref();
let invalidAssociatedProperty = ref(false);
let invalid = ref(false);
let associatedProperty = ref("");
let controller: Ref<AbortController> = ref({} as AbortController);
let autocompleteOptions: Ref<ConceptSummary[]> = ref([]);
let key = ref("");
let hoveredResult: Ref<ConceptSummary> = ref({} as ConceptSummary);
let optionsOverlayLocation: Ref<any> = ref({});

onBeforeUnmount(() => {
  if (isObjectHasKeys(optionsOverlayLocation.value)) {
    hideOptionsOverlay(optionsOverlayLocation.value);
  }
});

watch(selectedResult, (newValue, oldValue) => {
  if (newValue && _.isEqual(newValue, oldValue)) {
    itemSelected(newValue);
  }
});

async function init() {
  loading.value = true;
  if (isObjectHasKeys(props.shape, ["path"])) key.value = props.shape.path["@id"];
  getAssociatedProperty();
  await getAutocompleteOptions();
  if (props.value && isTTIriRef(props.value)) {
    const found = autocompleteOptions.value.find(option => option.name === props.value?.name);
    if (found) selectedResult.value = found;
  }
  loading.value = false;
}

function getAssociatedProperty() {
  if (isObjectHasKeys(props.shape, ["argument"])) {
    if (isArrayHasLength(props.shape.argument) && isObjectHasKeys(props.shape.argument[0], ["valueVariable"])) {
      invalidAssociatedProperty.value = false;
      if (props.shape.builderChild) {
        if (
          valueVariableMap &&
          (valueVariableMap.value.has(props.shape.argument[0].valueVariable + props.shape.order) ||
            valueVariableMap.value.has(props.shape.argument[0].valueVariable))
        ) {
          if (valueVariableMap.value.has(props.shape.argument[0].valueVariable)) {
            associatedProperty.value = valueVariableMap.value.get(props.shape.argument[0].valueVariable);
          } else {
            associatedProperty.value = valueVariableMap.value.get(props.shape.argument[0].valueVariable + props.shape.order);
          }
        } else {
          invalidAssociatedProperty.value = true;
        }
      } else if (valueVariableMap && valueVariableMap.value.has(props.shape.argument[0].valueVariable)) {
        associatedProperty.value = valueVariableMap.value.get(props.shape.argument[0].valueVariable);
      } else {
        invalidAssociatedProperty.value = true;
      }
    } else {
      invalidAssociatedProperty.value = false;
    }
  } else {
    invalidAssociatedProperty.value = false;
  }
}

async function getAutocompleteOptions() {
  if (associatedProperty.value) {
    let query = {} as QueryRequest;
    if (isObjectHasKeys(props.shape, ["select", "argument"])) {
      const args = processArguments(props.shape, valueVariableMap?.value);
      const replacedArgs = mapToObject(args);
      query.argument = replacedArgs;
      query.queryIri = props.shape.select[0];
    } else {
      throw new Error("EntityAutoComplete is missing 'select' or 'argument' in propertyShape object");
    }
    if (!isObject(controller.value)) {
      controller.value.abort();
    }
    controller.value = new AbortController();
    if (controller.value) {
      const result = await queryService.entityQuery(query, controller.value);
      if (result) {
        autocompleteOptions.value = result;
      } else {
        autocompleteOptions.value = [];
      }
    }
  }
}

function searchOptions(event: any) {
  if (!event.query.trim().length) {
    getAutocompleteOptions();
  } else {
    autocompleteOptions.value = autocompleteOptions.value.filter(option => option.name.toLocaleLowerCase().startsWith(event.query.toLocaleLowerCase()));
  }
}

async function itemSelected(value: ConceptSummary) {
  if (isObjectHasKeys(value)) {
    if (key.value) {
      updateEntity(value);
      await updateValidity(value);
    } else {
      emit("updateClicked", summaryToTTIriRef(value));
    }
  }
}

function summaryToTTIriRef(summary: ConceptSummary) {
  return { "@id": summary.iri, name: summary.name };
}

function updateEntity(value: ConceptSummary) {
  const result = {} as any;
  result[key.value] = summaryToTTIriRef(value);
  if (entityUpdate) entityUpdate(result);
}

async function updateValidity(value: ConceptSummary) {
  if (isObjectHasKeys(props.shape, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(value, props.shape.validation["@id"]));
  } else {
    invalid.value = !defaultValidity();
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidity() {
  return true;
}

function showTreeDialog(event: any): void {
  const x = treeOP.value as any;
  if (x) x.show(event, event.target);
}

function hideTreeOverlay(): void {
  const x = treeOP as any;
  if (x) x.hide();
}

function showOptionsOverlay(event: any, data?: any) {
  if (data) {
    const x: any = optionsOP.value;
    optionsOverlayLocation.value = event;
    x.show(optionsOverlayLocation.value);
    hoveredResult.value = data;
  }
}

function hideOptionsOverlay(event: any): void {
  const x: any = optionsOP.value;
  x.hide(event);
  optionsOverlayLocation.value = {};
}
</script>

<style scoped>
.autocomplete-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
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
  flex: 0 1 auto;
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
  width: 25rem;
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
