<template>
  <div class="property-builder">
    <div class="content-container">
      <EntityAutoComplete :value="propertyPath" :shape="propertyPathShape" :mode="mode" @updateClicked="updatePath" :disabled="!!inheritedFrom" />
      <i class="icon pi pi-arrow-right" />
      <EntityAutoComplete :value="propertyRange" :shape="propertyRangeShape" :mode="mode" @updateClicked="updateRange" />
      <Tag v-if="inheritedFrom" value="Inherited" />
      <ToggleButton v-model="required" onLabel="Required" offLabel="Not required" onIcon="pi pi-check" offIcon="pi pi-times" />
      <ToggleButton v-model="unique" onLabel="Unique" offLabel="Not unique" onIcon="pi pi-check" offIcon="pi pi-times" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropertyGroup, PropertyShape, TTIriRef, Property } from "im-library/dist/types/interfaces/Interfaces";
import { computed, inject, onMounted, PropType, Ref, ref, watch } from "vue";
import EntityAutoComplete from "./EntityAutoComplete.vue";
import _ from "lodash";
import { Config, Enums, Helpers, Services, Vocabulary } from "im-library";
import axios from "axios";
import injectionKeys from "@/injectionKeys/injectionKeys";
const { SHACL, IM, RDFS, RDF } = Vocabulary;
const { EntityService, QueryService } = Services;
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;
const { XmlSchemaDatatypes } = Config;

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

const propertyPathShape: PropertyShape = {
  comment: "selects an entity based on select query",
  name: "Path",
  componentType: { "@id": IM.ENTITY_AUTO_COMPLETE_COMPONENT },
  path: props.shape.path,
  builderChild: true,
  order: 1,
  select: [{ "@id": "http://endhealth.info/im#Query_GetIsas" }],
  argument: [{ valueIri: { "@id": IM.DATAMODEL_PROPERTY }, parameter: "this" }]
} as PropertyShape;
const propertyRangeShape: Ref<PropertyShape> = ref({
  comment: "selects an entity based on select query",
  name: "Range",
  order: 1,
  componentType: { "@id": IM.ENTITY_AUTO_COMPLETE_COMPONENT },
  path: props.shape.path,
  select: [{ name: "Search for concepts", "@id": "http://endhealth.info/im#Query_AllowableRanges" }],
  argument: [{ valueIri: { "@id": propertyPath.value["@id"] }, parameter: "this" }],
  builderChild: true
} as PropertyShape);

watch(propertyPath, newValue => {
  if (newValue["@id"] && propertyRangeShape.value.argument[0] && propertyRangeShape.value.argument[0].valueIri) {
    propertyRangeShape.value.argument[0].valueIri["@id"] = newValue["@id"];
  }
});

watch(
  () => _.cloneDeep(props.value),
  (newValue, oldValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) processProps();
  }
);

onMounted(async () => {
  loading.value = true;
  processProps();
  loading.value = false;
  await updateAll();
});

function processProps() {
  if (props.value) {
    if (isObjectHasKeys(props.value, ["http://www.w3.org/ns/shacl#path"]) && props.value["http://www.w3.org/ns/shacl#path"].length === 1)
      propertyPath.value = props.value["http://www.w3.org/ns/shacl#path"][0];
    if (
      isObjectHasKeys(props.value, ["http://www.w3.org/ns/shacl#node"]) &&
      _.isArray(props.value["http://www.w3.org/ns/shacl#node"]) &&
      props.value["http://www.w3.org/ns/shacl#node"].length === 1
    )
      propertyRange.value = props.value["http://www.w3.org/ns/shacl#node"][0];
    if (
      isObjectHasKeys(props.value, ["http://www.w3.org/ns/shacl#datatype"]) &&
      _.isArray(props.value["http://www.w3.org/ns/shacl#datatype"]) &&
      props.value["http://www.w3.org/ns/shacl#datatype"].length === 1
    )
      propertyRange.value = props.value["http://www.w3.org/ns/shacl#datatype"][0];
    if (
      isObjectHasKeys(props.value, ["http://www.w3.org/ns/shacl#class"]) &&
      _.isArray(props.value["http://www.w3.org/ns/shacl#class"]) &&
      props.value["http://www.w3.org/ns/shacl#class"].length === 1
    )
      propertyRange.value = props.value["http://www.w3.org/ns/shacl#class"][0];
    if (
      isObjectHasKeys(props.value, ["http://endhealth.info/im#inheritedFrom"]) &&
      _.isArray(props.value["http://endhealth.info/im#inheritedFrom"]) &&
      props.value["http://endhealth.info/im#inheritedFrom"].length === 1
    )
      inheritedFrom.value = props.value["http://endhealth.info/im#inheritedFrom"][0];
    if (isObjectHasKeys(props.value, ["http://www.w3.org/ns/shacl#minCount"]) && typeof props.value["http://www.w3.org/ns/shacl#minCount"] === "number")
      required.value = props.value["http://www.w3.org/ns/shacl#minCount"] > 0;
    else required.value = false;
    if (isObjectHasKeys(props.value, ["http://www.w3.org/ns/shacl#maxCount"]) && typeof props.value["http://www.w3.org/ns/shacl#maxCount"] === "number")
      unique.value = props.value["http://www.w3.org/ns/shacl#maxCount"] !== 0;
    else unique.value = false;
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
    if (XmlSchemaDatatypes.find(p => p === propertyRange.value["@id"])) {
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

<style scoped>
.content-container {
  display: flex;
  flex-flow: row wrap;
  /* border: solid 1px; */
  align-items: baseline;
}

.p-togglebutton {
  margin-right: 1rem;
}
</style>
