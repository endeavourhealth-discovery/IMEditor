<template>
  <div class="property-builder">
    <div>Property builder</div>
    <div>Order: {{ order }}</div>
    <EntityAutoComplete :value="propertyPath" :shape="propertyPathShape" :mode="mode" @updateClicked="updatePath" :disabled="!!inheritedFrom" />
    <EntityAutoComplete :value="propertyRange" :shape="propertyRangeShape" :mode="mode" @updateClicked="updateRange" />
    <Tag v-if="inheritedFrom" value="Inherited" />
    <label for="required">Required</label>
    <Checkbox name="required" value="Required" v-model="required" :binary="true" />
    <label for="unique">Unique</label>
    <Checkbox name="unique" value="Unique" v-model="unique" :binary="true" />
  </div>
</template>

<script setup lang="ts">
import { PropertyGroup, PropertyShape, TTIriRef, Property } from "im-library/dist/types/interfaces/Interfaces";
import { computed, inject, onMounted, PropType, Ref, ref, watch } from "vue";
import EntityAutoComplete from "./EntityAutoComplete.vue";
import _ from "lodash";
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import axios from "axios";
import injectionKeys from "@/injectionKeys/injectionKeys";
const { SHACL, IM, RDFS, RDF } = Vocabulary;
const { EntityService, QueryService } = Services;
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;

const props = defineProps({
  shape: { type: Object as PropType<PropertyShape>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Object as PropType<Property>, required: false },
  position: { type: Number, required: true }
});

const emit = defineEmits({
  updateClicked: (_payload: Property) => true
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const editorEntity = inject(injectionKeys.editorEntity)?.editorEntity;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;
const valueVariableMapUpdate = inject(injectionKeys.valueVariableMap)?.updateValueVariableMap;

const entityService = new EntityService(axios);
const queryService = new QueryService(axios);

const propertyPath: Ref<TTIriRef> = ref({} as TTIriRef);
const propertyRange: Ref<TTIriRef | undefined> = ref(undefined);
const inheritedFrom: Ref<TTIriRef | undefined> = ref(undefined);
const required = ref(false);
const unique = ref(false);
const loading = ref(true);
const invalid = ref(false);

watch(
  [propertyPath, propertyRange, inheritedFrom, required, unique],
  ([newPath, newRange, newInherited, newRequired, newUnique], [oldPath, oldRange, oldInherited, oldRequired, oldUnique]) => {
    if (!loading.value) {
      // if (!(newPath === oldPath && newRange === oldRange && newInherited === oldInherited && newRequired === oldRequired && newUnique === oldUnique))
      updateAll();
    }
  }
);

let key = props.shape.path["@id"];

const order = computed(() => props.position);

const dropdownOptions = [
  { "@id": SHACL.NODE, name: "Node" },
  { "@id": SHACL.DATATYPE, name: "Data type" },
  { "@id": SHACL.CLASS, name: "Class" }
];
const propertyPathShape = {
  comment: "selects an entity based on select query",
  name: "Path",
  componentType: IM.ENTITY_AUTO_COMPLETE_COMPONENT,
  path: props.shape.path,
  builderChild: true,
  order: 1,
  select: [{ "@id": "http://endhealth.info/im#Query_GetIsas" }],
  argument: [{ valueIri: { "@id": IM.DATAMODEL_PROPERTY }, parameter: "this" }]
};
const propertyRangeShape = ref({
  comment: "selects an entity based on select query",
  name: "Range",
  order: 1,
  componentType: IM.ENTITY_AUTO_COMPLETE_COMPONENT,
  path: props.shape.path,
  select: [{ name: "Search for concepts", "@id": "http://endhealth.info/im#Query_AllowableRanges" }],
  argument: [{ valueIri: { "@id": propertyPath.value["@id"] }, parameter: "this" }],
  builderChild: true
});

watch(propertyPath, newValue => {
  if (newValue["@id"]) {
    propertyRangeShape.value.argument[0].valueIri["@id"] = newValue["@id"];
  }
});

watch(
  () => _.cloneDeep(props.value),
  () => {
    processProps();
  }
);

onMounted(async () => {
  loading.value = true;
  processProps();
  loading.value = false;
});

function processProps() {
  if (props.value) {
    if (props.value["http://www.w3.org/ns/shacl#path"] && props.value["http://www.w3.org/ns/shacl#path"].length === 1)
      propertyPath.value = props.value["http://www.w3.org/ns/shacl#path"][0];
    if (props.value["http://www.w3.org/ns/shacl#node"] && props.value["http://www.w3.org/ns/shacl#node"].length === 1)
      propertyRange.value = props.value["http://www.w3.org/ns/shacl#node"][0];
    if (props.value["http://www.w3.org/ns/shacl#datatype"] && props.value["http://www.w3.org/ns/shacl#datatype"].length === 1)
      propertyRange.value = props.value["http://www.w3.org/ns/shacl#datatype"][0];
    if (props.value["http://www.w3.org/ns/shacl#class"] && props.value["http://www.w3.org/ns/shacl#class"].length === 1)
      propertyRange.value = props.value["http://www.w3.org/ns/shacl#class"][0];
    if (props.value["http://endhealth.info/im#inheritedFrom"] && props.value["http://endhealth.info/im#inheritedFrom"].length === 1)
      inheritedFrom.value = props.value["http://endhealth.info/im#inheritedFrom"][0];
    if (props.value["http://www.w3.org/ns/shacl#minCount"]) required.value = props.value["http://www.w3.org/ns/shacl#minCount"] > 0;
    if (props.value["http://www.w3.org/ns/shacl#maxCount"]) unique.value = !(props.value["http://www.w3.org/ns/shacl#maxCount"] > 0);
  } else {
    propertyPath.value = {} as TTIriRef;
    propertyRange.value = undefined;
    inheritedFrom.value = undefined;
  }
}

async function updatePath(data: any) {
  await getRange(data["@id"]);
}

async function getRange(iri: string) {
  const rangeIri = await entityService.getPartialEntity(iri, [RDFS.RANGE]);
  let result;
  if (rangeIri && isObjectHasKeys(rangeIri, [RDFS.RANGE])) result = await entityService.getPartialEntity(rangeIri[RDFS.RANGE][0]["@id"], [RDFS.LABEL]);
  if (result) propertyRange.value = { "@id": result["@id"], name: result[RDFS.LABEL] };
}

function updateRange(data: any) {
  propertyRange.value = data;
}

async function updateAll() {
  const property = await createProperty();
  if (!props.shape.builderChild) {
    updateEntity(property);
  } else {
    emit("updateClicked", property);
  }
  updateValueVariableMap(property);
  await updateValidity();
}

async function createProperty() {
  const property = {} as Property;
  property["http://www.w3.org/ns/shacl#path"] = [propertyPath.value];
  await setRange(property);
  if (inheritedFrom.value) property["http://endhealth.info/im#inheritedFrom"] = [inheritedFrom.value];
  if (required.value) property["http://www.w3.org/ns/shacl#minCount"] = 1;
  else property["http://www.w3.org/ns/shacl#minCount"] = 0;
  if (unique.value) property["http://www.w3.org/ns/shacl#maxCount"] = 1;
  else property["http://www.w3.org/ns/shacl#maxCount"] = 0;
  return property;
}

async function setRange(property: Property) {
  if (propertyRange.value) {
    const primativeTypes = await entityService.getEntityChildren(IM.STATUS);
    if (primativeTypes && primativeTypes.find(p => p["@id"] === propertyRange.value["@id"])) {
      property["http://www.w3.org/ns/shacl#datatype"] = [propertyRange.value];
    } else {
      const type = await entityService.getPartialEntity(propertyRange.value["@id"], [RDF.TYPE]);
      if (type[RDF.TYPE]) {
        switch (type[RDF.TYPE]) {
          case IM.CONCEPT:
          case IM.CONCEPT_SET:
            property["http://www.w3.org/ns/shacl#class"] = [propertyRange.value];
            break;
          default:
            property["http://www.w3.org/ns/shacl#node"] = [propertyRange.value];
        }
      }
    }
  }
}

function updateEntity(data: Property) {
  const result = {} as any;
  result[key] = data;
  if (entityUpdate) entityUpdate(result);
}

function updateValueVariableMap(data: Property) {
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
  return true;
}
</script>

<style scoped></style>