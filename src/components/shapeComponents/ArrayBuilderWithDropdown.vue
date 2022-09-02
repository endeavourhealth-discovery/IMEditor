<template>
  <div class="array-dropdown-builder-container">
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
    </div>
    <div v-else class="dropdown-children-container">
      <!-- <h3>{{ shape.name }}:</h3> -->
      <Dropdown v-model="selectedOption" :options="dropdownOptions" optionLabel="name" placeholder="Select..." />
      <div class="children-container" :class="invalid && 'invalid'">
        <small v-if="invalid" class="validate-error">{{ validationErrorMessage }}</small>
        <template v-for="item of build" :key="item.id">
          <component
            :is="item.type"
            :value="item.value"
            :id="item.id"
            :position="item.position"
            :showButtons="item.showButtons"
            :shape="item.shape"
            :mode="mode"
            :nextComponentOptions="getNextComponentOptions()"
            @deleteClicked="deleteItem"
            @addClicked="addItemWrapper"
            @updateClicked="updateItemWrapper"
            @addNextOptionsClicked="addItemWrapper"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import BuilderDropdownChildWrapper from "./BuilderDropdownChildWrapper.vue";
import { emit } from "process";

export default defineComponent({
  components: { BuilderDropdownChildWrapper }
});
</script>

<script setup lang="ts">
import { ref, Ref, watch, computed, onMounted, inject, PropType, defineComponent } from "vue";
import { Enums, Helpers, Services, Vocabulary } from "im-library";
import store from "@/store";
import injectionKeys from "@/injectionKeys/injectionKeys";
import _ from "lodash";
import { ComponentDetails, EntityReferenceNode, Namespace, PropertyGroup, PropertyShape, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength },
  EditorBuilderJsonMethods: { generateNewComponent, updatePositions, addItem, updateItem },
  TypeGuards: { isPropertyShape, isPropertyGroup, isTTIriRef },
  EditorMethods: { processComponentType }
} = Helpers;
const { QueryService, EntityService } = Services;
const { BuilderType, ComponentType } = Enums;
const { IM, RDFS } = Vocabulary;

const props = defineProps({
  shape: { type: Object as PropType<PropertyGroup>, required: true },
  mode: { type: String as PropType<Enums.EditorMode>, required: true },
  value: { type: Object as PropType<any>, required: false }
});

const emit = defineEmits({
  updateClicked: (_payload: any) => true
});

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;
const deleteEntityKey = inject(injectionKeys.editorEntity)?.deleteEntityKey;
const validityUpdate = inject(injectionKeys.editorValidity)?.updateValidity;

const queryService = new QueryService(axios);
const entityService = new EntityService(axios);

let key = props.shape.path["@id"];

let loading = ref(true);
let invalid = ref(false);
let selectedOption: Ref<TTIriRef | undefined> = ref();
let dropdownOptions: Ref<TTIriRef[]> = ref([]);
let validationErrorMessage = "Failed validation";
let build: Ref<ComponentDetails[]> = ref([]);
onMounted(async () => {
  loading.value = true;
  key = props.shape.path["@id"];
  if (isObjectHasKeys(props.shape, ["validationErrorMessage"])) validationErrorMessage = props.shape.validationErrorMessage;
  dropdownOptions.value = await getDropdownOptions();
  await createBuild();
  loading.value = false;
});
watch(
  () => _.cloneDeep(props.shape),
  async () => {
    loading.value = true;
    key = props.shape.path["@id"];
    if (isObjectHasKeys(props.shape, ["validationErrorMessage"])) validationErrorMessage = props.shape.validationErrorMessage;
    dropdownOptions.value = await getDropdownOptions();
    setDropdownFromValue();
    await createBuild();
    loading.value = false;
  }
);
watch(
  () => _.cloneDeep(build.value),
  async () => {
    if (entityUpdate) updateEntity();
    if (validityUpdate) await updateValidity();
  }
);

function hasValidOptionKey(value: any) {
  const found = dropdownOptions.value.find(option => option["@id"] === Object.keys(value)[0]);
  if (found) {
    return true;
  } else return false;
}

async function createBuild() {
  build.value = [];
  if (!props.value || !isObjectHasKeys(props.value) || !hasValidOptionKey(props.value)) {
    createDefaultBuild();
    loading.value = false;
    return;
  }
  setDropdownFromValue();
  let position = 0;
  if (selectedOption.value) {
    for (const item of props.value[selectedOption.value["@id"]]) {
      build.value.push(await processChild(item, position));
      position++;
    }
  }
  if (!isArrayHasLength(build.value)) {
    createDefaultBuild();
  }
}

function createDefaultBuild() {
  build.value = [];
  if (isPropertyGroup(props.shape)) {
    if (isObjectHasKeys(props.shape, ["property"])) {
      props.shape.property.forEach(property => {
        build.value.push(
          generateNewComponent(ComponentType.BUILDER_DROPDOWN_CHILD_WRAPPER, property.order - 1, undefined, property, { minus: true, plus: true }, props.mode)
        );
      });
    }
    if (isObjectHasKeys(props.shape, ["subGroup"])) {
      props.shape.subGroup.forEach(subGroup => {
        build.value.push(
          generateNewComponent(ComponentType.BUILDER_DROPDOWN_CHILD_WRAPPER, subGroup.order - 1, undefined, subGroup, { minus: true, plus: true }, props.mode)
        );
      });
    }
  }
}

async function processChild(child: any, position: number) {
  if (isTTIriRef(child)) {
    return generateNewComponent(
      ComponentType.BUILDER_DROPDOWN_CHILD_WRAPPER,
      position,
      child,
      isObjectHasKeys(props.shape, ["property"]) ? props.shape.property[0] : props.shape.subGroup[0],
      {
        minus: true,
        plus: true
      },
      props.mode
    );
  } else {
    return generateNewComponent(
      ComponentType.BUILDER_DROPDOWN_CHILD_WRAPPER,
      position,
      await processComponentGroupData(child),
      isObjectHasKeys(props.shape, ["subGroup"]) ? props.shape.subGroup[0] : props.shape.property[0],
      {
        minus: true,
        plus: true
      },
      props.mode
    );
  }
}

async function processComponentGroupData(data: any) {
  if (isObjectHasKeys(data)) {
    const iris = [];
    const key = Object.keys(data)[0];
    let withName = await entityService.getPartialEntity(key, [RDFS.LABEL]);
    withName = { "@id": withName["@id"], name: withName[RDFS.LABEL] };
    iris.push(withName);
    iris.push(data[key][0]);
    return iris;
  }
}

function generateBuildAsJson() {
  const jsonBuild = [] as any[];
  build.value.forEach(item => {
    if (isObjectHasKeys(item.json)) {
      jsonBuild.push(item.json);
    }
  });
  const jsonObject = {} as any;
  if (selectedOption.value) jsonObject[selectedOption.value?.["@id"]] = jsonBuild;
  // return build.value.map(item => item.json);
  return jsonObject;
}

async function getDropdownOptions() {
  if (isObjectHasKeys(props.shape, ["function"])) {
    return await queryService.runFunction(props.shape.function["@id"]);
  } else throw new Error("propertygroup is missing 'function' parameter to fetch dropdown options");
}

function setDropdownFromValue() {
  if (props.value) {
    const found = dropdownOptions.value.find(option => option["@id"] === Object.keys(props.value)[0]);
    if (found) selectedOption.value = found;
  }
}

function updateEntity() {
  const value = generateBuildAsJson();
  const result = {} as any;
  result[key] = value;
  if (entityUpdate && isObjectHasKeys(value) && !props.shape.builderChild) entityUpdate(result);
  else if (entityUpdate && isObjectHasKeys(value)) emit("updateClicked", value);
  else if (deleteEntityKey && !props.shape.minCount) deleteEntityKey(key);
}

async function updateValidity() {
  if (isPropertyShape(props.shape) && isObjectHasKeys(props.shape, ["validation"])) {
    invalid.value = !(await queryService.checkValidation(props.shape.validation["@id"], generateBuildAsJson()));
  } else {
    invalid.value = !defaultValidation();
  }
  if (validityUpdate) validityUpdate({ key: key, valid: !invalid.value });
}

function defaultValidation() {
  return generateBuildAsJson().every((item: any) => isObjectHasKeys(item, ["@id", "name"]));
}

function addItemWrapper(data: { selectedType: Enums.ComponentType; position: number; value: any; shape: PropertyShape | PropertyGroup }): void {
  let shape;
  if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["property"])) {
    shape = props.shape.property.find(p => processComponentType(p.componentType) === data.selectedType);
  } else if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["subGroup"])) {
    shape = props.shape.subGroup.find(s => processComponentType(s.componentType) === data.selectedType);
  }
  if (data.selectedType !== ComponentType.BUILDER_DROPDOWN_CHILD_WRAPPER) {
    data.selectedType = ComponentType.BUILDER_DROPDOWN_CHILD_WRAPPER;
  }
  if (shape) addItem(data, build.value, { minus: true, plus: true }, shape, props.mode);
}

function deleteItem(data: ComponentDetails): void {
  const index = build.value.findIndex(item => item.position === data.position);
  build.value.splice(index, 1);
  if (build.value.length === 0) {
    createDefaultBuild();
    return;
  }
  updatePositions(build.value);
}

function updateItemWrapper(data: ComponentDetails) {
  updateItem(data, build.value);
}

function getNextComponentOptions() {
  const options = [];
  if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["subGroup"]))
    options.push(
      props.shape.subGroup.map(subGroup => {
        return { type: processComponentType(subGroup.componentType), name: subGroup.name };
      })
    );
  if (isPropertyGroup(props.shape) && isObjectHasKeys(props.shape, ["property"]))
    options.push(
      props.shape.property.map(property => {
        return { type: processComponentType(property.componentType), name: property.name };
      })
    );
  if (options.length) return options;
  else return;
}
</script>

<style scoped>
.array-dropdown-builder-container {
  width: 100%;
  display: flex;
  flex-flow: column nowrap;
}
.loading-container {
  flex: 1 1 auto;
  width: 100%;
  justify-content: center;
  align-items: center;
  display: flex;
  flex-flow: column;
}

.dropdown-children-container {
  border: 1px solid #dee2e6;
  border-radius: 3px;
  padding: 1rem;
  overflow: auto;
}

.children-container {
  margin-left: 2rem;
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  flex: 1 1 auto;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 1rem;
  overflow: auto;
}
.invalid {
  border-color: #e24c4c;
}
</style>
