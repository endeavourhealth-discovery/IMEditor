import store from "@/store/index";
import { flushPromises } from "@vue/test-utils";
import AuthService from "@/services/AuthService";
import { Vocabulary, Models } from "im-library";
import { expect } from "vitest";
const { IM } = Vocabulary;
const {
  User,
  Search: { SearchRequest },
  CustomAlert
} = Models;

vi.mock("@/main", () => {
  return {
    default: {
      $configService: {
        getXmlSchemaDataTypes: vi.fn(),
        getFilterDefaults: vi.fn()
      },
      $entityService: {
        advancedSearch: vi.fn()
      },
      $loggerService: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), success: vi.fn(), debug: vi.fn() }
    }
  };
});

import vm from "@/main";

describe("state", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.sessionStorage.clear();
    vm.$configService.getXmlSchemaDataTypes = vi
      .fn()
      .mockResolvedValue(["http://www.w3.org/2001/XMLSchema#string", "http://www.w3.org/2001/XMLSchema#boolean"]);
  });

  afterAll(() => {
    window.sessionStorage.clear();
  });

  it("should start with the correct values", () => {
    expect(Object.keys(store.state)).toStrictEqual([
      "arrayObjectNameListboxWithLabelStartExpanded",
      "history",
      "recentLocalActivity",
      "currentUser",
      "filterDefaults",
      "isLoggedIn",
      "snomedLicenseAccepted",
      "editorIri",
      "snomedReturnUrl",
      "authReturnUrl",
      "editorSavedEntity",
      "tagSeverityMatches",
      "textDefinitionStartExpanded",
      "filterOptions",
      "selectedFilters",
      "quickFiltersStatus",
      "creatorInvalidEntity",
      "creatorValidity",
      "editorInvalidEntity",
      "editorValidity",
      "refreshTree"
    ]);
    expect(store.state.history).toEqual([]);
    expect(store.state.currentUser).toEqual({});
    expect(store.state.isLoggedIn).toBeFalsy();
    expect(store.state.snomedLicenseAccepted).toBeNull();
    expect(store.state.editorIri).toBeNull();
    expect(store.state.editorSavedEntity).toBeNull();
    expect(store.state.selectedFilters).toEqual({
      status: [],
      schemes: [],
      types: [],
      sortDirection: "",
      sortField: ""
    });
    expect(store.state.filterOptions).toStrictEqual({ status: [], schemes: [], types: [], sortDirections: [], sortFields: [] });
    expect(store.state.quickFiltersStatus).toEqual(new Map());
  });
});

describe("mutations", () => {
  it("can updateHistory", () => {
    const testHistory = { url: "testUrl", conceptName: "testName", view: "testVuew" };
    store.commit("updateHistory", testHistory);
    expect(store.state.history).toEqual([testHistory]);
  });

  it("can updateHistory ___ duplicate", () => {
    const testHistory = { url: "testUrl", conceptName: "testName", view: "testVuew" };
    store.commit("updateHistory", testHistory);
    store.commit("updateHistory", testHistory);
    expect(store.state.history).toEqual([testHistory]);
  });

  it("can updateCurrentUser", () => {
    const testUser = new User("testUser", "John", "Doe", "john.doe@ergosoft.co.uk", "", "colour/003-man.png");
    store.commit("updateCurrentUser", testUser);
    expect(store.state.currentUser).toEqual(testUser);
  });

  it("can updateIsLoggedIn", () => {
    const testBool = true;
    store.commit("updateIsLoggedIn", testBool);
    expect(store.state.isLoggedIn).toBe(true);
  });

  it("can updateSnomedLicenseAccepted", () => {
    const testBool = "true";
    store.commit("updateSnomedLicenseAccepted", testBool);
    expect(store.state.snomedLicenseAccepted).toBe("true");
  });

  it("can updateEditorIri", () => {
    const testIri = "testIri";
    store.commit("updateEditorIri", testIri);
    expect(store.state.editorIri).toBe("testIri");
  });

  it("can updateSelectedFilters", () => {
    const testFilter = {
      selectedStatus: ["testActive", "testDraft"],
      selectedSchemes: [{ iri: "http://endhealth.info/im#test" }],
      selectedTypes: ["testClass", "testProperty"]
    };
    store.commit("updateSelectedFilters", testFilter);
    expect(store.state.selectedFilters).toEqual(testFilter);
  });

  it("can updateQuickFiltersStatus", () => {
    const testfilters = new Map();
    testfilters.set("legacy", true);
    store.commit("updateQuickFiltersStatus", { key: "legacy", value: true });
    expect(store.state.quickFiltersStatus).toEqual(testfilters);
  });

  it("can updateFilterOptions", () => {
    const testFilter = {
      status: [
        { "@id": "testActiveIri", name: "Active" },
        { "@id": "testDraftIri", name: "Draft" }
      ],
      schemes: [{ iri: "http://endhealth.info/im#test" }],
      types: [
        { "@id": "testClassIri", name: "Class" },
        { "@id": "testPropertyIri", name: "Property" }
      ]
    };
    store.commit("updateFilterOptions", testFilter);
    expect(store.state.filterOptions).toEqual(testFilter);
  });
});

describe("actions", () => {
  it("can logoutCurrentUser ___ 200", async () => {
    AuthService.signOut = vi.fn().mockResolvedValue(new CustomAlert(200, "logout successful"));
    vm.$loggerService.error = vi.fn();
    let result = false;
    await store.dispatch("logoutCurrentUser").then(res => (result = res));
    await flushPromises();
    expect(AuthService.signOut).toBeCalledTimes(1);
    await flushPromises();
    expect(store.state.currentUser).toBe(null);
    expect(store.state.isLoggedIn).toBe(false);
    expect(result).toEqual(new CustomAlert(200, "logout successful"));
  });

  it("can logoutCurrentUser ___ 400", async () => {
    AuthService.signOut = vi.fn().mockResolvedValue(new CustomAlert(400, "logout failed 400"));
    vm.$loggerService.error = vi.fn();
    let result = false;
    await store.dispatch("logoutCurrentUser").then(res => (result = res));
    await flushPromises();
    expect(AuthService.signOut).toBeCalledTimes(1);
    await flushPromises();
    expect(result).toEqual(new CustomAlert(400, "logout failed 400"));
  });

  it("can authenticateCurrentUser___ 200 ___ avatar", async () => {
    let testUser = new User("testUser", "John", "Doe", "john.doe@ergosoft.co.uk", "", "colour/003-man.png");
    testUser.setId("8901-test");
    AuthService.getCurrentAuthenticatedUser = vi.fn().mockResolvedValue(new CustomAlert(200, "user authenticated", undefined, testUser));
    let result = { authenticated: false };
    await store.dispatch("authenticateCurrentUser").then(res => (result = res));
    await flushPromises();
    expect(AuthService.getCurrentAuthenticatedUser).toBeCalledTimes(1);
    await flushPromises();
    expect(store.state.isLoggedIn).toBe(true);
    expect(store.state.currentUser).toEqual(testUser);
    expect(result.authenticated).toBe(true);
  });

  it("can authenticateCurrentUser___ 200 ___ no avatar", async () => {
    let testUser = new User("testUser", "John", "Doe", "john.doe@ergosoft.co.uk", "", "http://testimage.jpg");
    testUser.setId("8901-test");
    AuthService.getCurrentAuthenticatedUser = vi.fn().mockResolvedValue(new CustomAlert(200, "user authenticated", undefined, testUser));
    let result = { authenticated: false };
    await store.dispatch("authenticateCurrentUser").then(res => (result = res));
    await flushPromises();
    expect(AuthService.getCurrentAuthenticatedUser).toBeCalledTimes(1);
    await flushPromises();
    expect(store.state.isLoggedIn).toBe(true);
    testUser.avatar = "colour/001-man.png";
    expect(store.state.currentUser).toEqual(testUser);
    expect(result.authenticated).toBe(true);
  });

  it("can authenticateCurrentUser___ 403 ___ logout 200", async () => {
    AuthService.getCurrentAuthenticatedUser = vi.fn().mockResolvedValue(new CustomAlert(403, "user authenticated"));
    AuthService.signOut = vi.fn().mockResolvedValue(new CustomAlert(200, "logout successful"));
    vm.$loggerService.info = vi.fn();
    let result = { authenticated: false };
    await store.dispatch("authenticateCurrentUser").then(res => (result = res));
    await flushPromises();
    expect(AuthService.getCurrentAuthenticatedUser).toBeCalledTimes(1);
    await flushPromises();
    expect(AuthService.signOut).toBeCalledTimes(1);
    await flushPromises();
    expect(store.state.isLoggedIn).toBe(false);
    expect(store.state.currentUser).toBe(null);
    expect(result.authenticated).toBe(false);
    expect(vm.$loggerService.info).toBeCalledTimes(1);
    expect(vm.$loggerService.info).toBeCalledWith(undefined, "Force logout successful");
  });

  it("can authenticateCurrentUser___ 403 ___ logout 200", async () => {
    AuthService.getCurrentAuthenticatedUser = vi.fn().mockResolvedValue(new CustomAlert(403, "user authenticated"));
    AuthService.signOut = vi.fn().mockResolvedValue(new CustomAlert(400, "logout failed"));
    vm.$loggerService.error = vi.fn();
    let result = { authenticated: false };
    await store.dispatch("authenticateCurrentUser").then(res => (result = res));
    await flushPromises();
    expect(AuthService.getCurrentAuthenticatedUser).toBeCalledTimes(1);
    await flushPromises();
    expect(AuthService.signOut).toBeCalledTimes(1);
    await flushPromises();
    expect(store.state.isLoggedIn).toBe(false);
    expect(store.state.currentUser).toBe(null);
    expect(result.authenticated).toBe(false);
    expect(vm.$loggerService.error).toBeCalledTimes(1);
    expect(vm.$loggerService.error).toBeCalledWith(undefined, "Force logout failed");
  });
});
