<template>
  <div class="quantifier-item-container">
    <div class="label-container">
      <span class="float-text">Quantifier</span>
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
        />
        <Button icon="fa-solid fa-sitemap" @click="showTreeDialog($event)" />
      </div>
      <small v-if="invalidAssociatedProperty" class="validate-error">Missing property for refinement. Please select a property first.</small>
    </div>
  </div>
  <!-- <OverlayPanel class="tree-op" ref="treeOP" :showCloseIcon="true" :dismissable="true">
    <QuantifierTree :isAs="isAs" :quantifier="selectedResult" @treeNodeSelected="updateSelectedResult" />
  </OverlayPanel> -->
</template>

<script setup lang="ts">
import { PropType, watch, ref, Ref, onMounted, inject } from "vue";
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
import injectionKeys from "@/injectionKeys/injectionKeys.js";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys, isObject },
  TypeGuards: { isTTIriRef },
  Sorters: { byName },
  EditorMethods: { processArguments },
  Transforms: { mapToObject }
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

onMounted(async () => {
  console.log(props.shape);
  await init();
});

let loading = ref(false);
let selectedResult: Ref<ConceptSummary | undefined> = ref();
let invalidAssociatedProperty = ref(false);
let invalid = ref(false);
let associatedProperty: Ref<TTIriRef> = ref({} as TTIriRef);
let controller: Ref<AbortController> = ref({} as AbortController);
let autocompleteOptions: Ref<ConceptSummary[]> = ref([]);
let key = ref("");

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
      if (props.shape.builderChild && props.shape.argument[0].valueVariable === "propertyIri") {
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
  if (associatedProperty.value && associatedProperty.value["@id"]) {
    let query = {} as QueryRequest;
    if (isObjectHasKeys(props.shape, ["select", "argument"])) {
      const args = processArguments(props.shape);
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
