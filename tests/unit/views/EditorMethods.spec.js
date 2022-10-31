import { afterAll, vi } from "vitest";
import { Enums, Services, Vocabulary } from "im-library";
import { fakerFactory } from "../../../src/mocks/factory";
import testData from "./EditorMethods.testData";
import { mount } from "vue-composable-tester";
import { provide } from "vue";
const { EntityService } = Services;
const { IM } = Vocabulary;

describe("fetchEntity", () => {
  let getFullEntitySpy;
  beforeEach(async () => {
    vi.resetModules();
    getFullEntitySpy = vi.spyOn(EntityService.prototype, "getFullEntity");
  });

  it("does nothing if no editorIri", async () => {
    vi.doMock("vuex", () => ({
      useStore: vi.fn().mockReturnValue({ state: { editorIri: undefined } })
    }));
    let { setupEntity, setupShape } = await import("../../../src/views/EditorMethods");
    const { fetchEntity, editorEntity, editorEntityOriginal, entityName } = setupEntity();
    await fetchEntity();
    expect(getFullEntitySpy).not.toHaveBeenCalled();
    expect(editorEntity.value).toEqual({});
    expect(editorEntityOriginal.value).toEqual({});
    expect(entityName.value).toEqual("");
  });

  it("gets full entity by iri and process entity", async () => {
    vi.doMock("vuex", () => ({
      useStore: vi.fn().mockReturnValue({ state: { editorIri: "testIri" } })
    }));
    let { setupEntity, setupShape } = await import("../../../src/views/EditorMethods");
    const testEntity = fakerFactory.entity.create();
    getFullEntitySpy.mockResolvedValue(testEntity);
    let { fetchEntity, editorEntity, editorEntityOriginal, entityName, processEntity } = setupEntity();
    await fetchEntity();
    expect(getFullEntitySpy).toHaveBeenCalled();
    expect(editorEntityOriginal.value).toEqual(processEntity(testEntity));
    expect(editorEntity.value).toEqual(processEntity(testEntity));
    expect(entityName.value).toEqual(testEntity["http://www.w3.org/2000/01/rdf-schema#label"]);
  });
});

describe("processEntity", () => {
  it("changes @id to full iri and removes im1id and im1scheme", async () => {
    const { setupEntity } = await import("../../../src/views/EditorMethods");
    const { processEntity } = setupEntity();
    const testEntity = fakerFactory.entity.create();
    testEntity[IM.IM_1_ID] = "testIri";
    testEntity[IM.IM_1_SCHEME] = [{ "@id": "testScheme" }];
    const result = processEntity(testEntity);
    expect(result).toEqual(expect.objectContaining({ "http://endhealth.info/im#id": testEntity["@id"] }));
    expect(result).toEqual(
      expect.not.objectContaining({ "http://endhealth.info/im#im1Id": testEntity.IM_1_ID, "http://endhealth.info/im#im1Scheme": testEntity.IM_1_SCHEME })
    );
  });
});

describe("setupShape", async () => {
  let getShapeFromTypeSpy;
  let getShapeSpy;

  describe("getShape", () => {
    beforeEach(() => {
      vi.resetAllMocks();
      getShapeFromTypeSpy = vi.spyOn(EntityService.prototype, "getShapeFromType");
      getShapeSpy = vi.spyOn(EntityService.prototype, "getShape");
    });

    it("gets shape from a type iri ___ success", async () => {
      const { setupShape } = await import("../../../src/views/EditorMethods");
      const {
        getShape,
        getShapesCombined,
        addToShape,
        processShape,
        processComponentType,
        setEditorSteps,
        setCreatorSteps,
        shape,
        targetShape,
        groups,
        stepsItems
      } = setupShape();
      getShapeFromTypeSpy.mockResolvedValue({ "@id": testData.CONCEPT_SHAPE["@id"] });
      getShapeSpy.mockResolvedValue(testData.CONCEPT_SHAPE);
      const newShape = await getShape("testTypeIri");
      expect(newShape).toEqual(testData.CONCEPT_SHAPE);
    });

    it("gets shape from a type iri ___ fail", async () => {
      const { setupShape } = await import("../../../src/views/EditorMethods");
      const {
        getShape,
        getShapesCombined,
        addToShape,
        processShape,
        processComponentType,
        setEditorSteps,
        setCreatorSteps,
        shape,
        targetShape,
        groups,
        stepsItems
      } = setupShape();
      getShapeFromTypeSpy.mockResolvedValue({});
      getShapeSpy.mockResolvedValue(testData.CONCEPT_SHAPE);
      const newShape = await getShape("testTypeIri");
      expect(newShape).toEqual({});
    });
  });

  describe("addToShape", () => {
    it("adds missing groups to the existing shape", async () => {
      const { setupShape } = await import("../../../src/views/EditorMethods");
      const {
        getShape,
        getShapesCombined,
        addToShape,
        processShape,
        processComponentType,
        setEditorSteps,
        setCreatorSteps,
        shape,
        targetShape,
        groups,
        stepsItems
      } = setupShape();
      const startShape = { ...testData.CONCEPT_SHAPE };
      const shapeToAdd = { ...testData.CONCEPT_SET_SHAPE };
      expect(startShape.group.length).toBe(4);
      addToShape(startShape, shapeToAdd);
      expect(startShape.group.length).toBe(5);
      expect(startShape.group[0]).toEqual(testData.CONCEPT_SHAPE.group[0]);
      expect(startShape.group[1]).toEqual(testData.CONCEPT_SHAPE.group[1]);
      expect(startShape.group[2]).toEqual(testData.CONCEPT_SHAPE.group[2]);
      expect(startShape.group[3]).toEqual(testData.CONCEPT_SHAPE.group[3]);
      expect(startShape.group[4]).toEqual(testData.CONCEPT_SET_SHAPE.group[3]);
    });
  });

  // describe("processShape", () => {
  //   it("sets targetShape, sets groups and calls a steps setter ___ editor", async () => {
  //     const addRouteMock = vi.fn();
  //     vi.doMock("vue-router", () => ({
  //       useRouter: () => ({ options: { routes: [{ name: "Editor" }] }, addRoute: addRouteMock }),
  //       useRoute: () => ({ fullPath: "/editor/http:%2F%2Fendhealth.info%2Fim%23CSET_OralNSAIDs/Summary details", name: "Editor" })
  //     }));
  //     const { setupShape } = await import("../../../src/views/EditorMethods");
  //     const { result } = mount(() => setupShape());
  //     const startShape = { ...testData.CONCEPT_SHAPE };
  //     const entity = { ...testData.ENTITY };
  //     result.processShape(startShape, Enums.EditorMode.EDIT, entity);
  //     expect(result.targetShape.value).toDeepEqual(startShape);
  //     expect(result.groups.value).toDeepEqual(startShape.group);
  //     expect(addRouteMock).toHaveBeenCalled();
  //   });
  // });
});
