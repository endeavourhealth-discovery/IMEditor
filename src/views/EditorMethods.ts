import { computed, Ref, ref } from "vue";
import { FormGenerator, PropertyGroup, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { Helpers, Services, Vocabulary } from "im-library";
import axios from "axios";
import StepsGroup from "@/components/creator/StepsGroup.vue";
import { useStore } from "vuex";
import { useRoute, useRouter } from "vue-router";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { IM, RDFS, RDF } = Vocabulary;
const { EntityService } = Services;

const entityService = new EntityService(axios);
const router = useRouter();
const route = useRoute();
const store = useStore();

export function setupShape() {
  let shape: Ref<FormGenerator | undefined> = ref();
  let targetShape: Ref<TTIriRef | undefined> = ref();
  let groups: Ref<PropertyGroup[]> = ref([]);
  let stepsItems: Ref<{ label: string; to: string }[]> = ref([]);

  async function getShapesCombined(types: TTIriRef[]) {
    let shapeCombined: any = {};
    for (const type of types) {
      const typeShape = await getShape(type["@id"]);
      if (isObjectHasKeys(typeShape, ["group"])) addToShape(shapeCombined, typeShape);
    }
    shape.value = { ...shapeCombined };
  }

  function addToShape(shape: any, shapeToAdd: any) {
    for (const groupToAdd of shapeToAdd.group) {
      if (isObjectHasKeys(shape, ["group"]) && !shape.group.includes((group: any) => group.name === groupToAdd.name)) {
        groupToAdd.order = shape.group.length + 1;
        shape.group.push(groupToAdd);
      } else shape = shapeToAdd;
    }
  }

  async function getShape(type: string): Promise<any> {
    let newShape = {};
    const shapeIri = await entityService.getShapeFromType(type);
    if (shapeIri) newShape = await entityService.getShape(shapeIri["@id"]);
    return newShape;
  }

  function processShape(shape: FormGenerator) {
    targetShape.value = shape.targetShape;
    groups.value = shape.group;
    setSteps();
  }

  function setSteps() {
    stepsItems.value = [];
    const editorRoute = router.options.routes.find(r => r.name === "Editor");
    const currentPath = route.fullPath;
    if (editorRoute) {
      groups.value.forEach(group => {
        const component = processComponentType(group.componentType);
        if (editorRoute.children?.findIndex(route => route.name === group.name) === -1) {
          editorRoute.children?.push({ path: group.name, name: group.name, component: component });
        }
        stepsItems.value.push({ label: group.name, to: currentPath + "/" + group.name });
      });
      router.addRoute(editorRoute);
    }
  }

  function processComponentType(type: TTIriRef) {
    switch (type["@id"]) {
      case IM.STEPS_GROUP_COMPONENT:
        return StepsGroup;
      default:
        throw new Error("Invalid component type encountered in shape group" + type["@id"]);
    }
  }

  return { shape, targetShape, groups, addToShape, getShape, getShapesCombined, stepsItems, processShape, setSteps, processComponentType };
}

export function setupEntity() {
  let editorEntityOriginal: Ref<any> = ref({});
  let editorEntity: Ref<any> = ref({});
  let entityName = ref("");

  const editorIri = computed(() => store.state.editorIri).value;
  const editorSavedEntity = computed(() => store.state.editorSavedEntity).value;
  const hasType = computed<boolean>(() => {
    return isObjectHasKeys(editorEntity.value, [RDF.TYPE]) && isArrayHasLength(editorEntity.value[RDF.TYPE]);
  });

  async function fetchEntity(): Promise<void> {
    if (editorIri) {
      // if (isObjectHasKeys(editorSavedEntity, [IM.ID]) && editorSavedEntity[IM.ID] === editorIri) {
      //   editorEntity.value = editorSavedEntity;
      //   return;
      // }
      const fullEntity = await entityService.getFullEntity(editorIri);
      if (isObjectHasKeys(fullEntity)) {
        const processedEntity = processEntity(fullEntity);
        editorEntityOriginal.value = processedEntity;
        editorEntity.value = { ...editorEntityOriginal.value };
        entityName.value = editorEntityOriginal.value[RDFS.LABEL];
      }
    }
  }

  function processEntity(entity: any) {
    const result = { ...entity } as any;
    if (isObjectHasKeys(result, ["@id"])) {
      result[IM.ID] = result["@id"];
      delete result["@id"];
    }
    if (isObjectHasKeys(result, [IM.IM_1_ID])) delete result[IM.IM_1_ID];
    if (isObjectHasKeys(result, [IM.IM_1_SCHEME])) delete result[IM.IM_1_SCHEME];
    return result;
  }
  return { editorEntity, editorEntityOriginal, fetchEntity, processEntity, editorIri, editorSavedEntity, entityName, hasType };
}
