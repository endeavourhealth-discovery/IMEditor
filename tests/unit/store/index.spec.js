import store from "@/store/index";
import { flushPromises } from "@vue/test-utils";
import AuthService from "@/services/AuthService";
import { Config, Vocabulary, Models, Services } from "im-library";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, vi } from "vitest";
import IMLibrary from "im-library";
const { IM } = Vocabulary;
const { User, CustomAlert } = Models;
const { LoggerService } = Services;

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
  // block real fetch requests with msw intercept server
  const restHandlers = [];
  const server = setupServer(...restHandlers);
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    server.close();
  });
  afterEach(() => {
    server.resetHandlers();
  });

  it("can fetchBlockedIris", async () => {
    store.dispatch("fetchBlockedIris");
    expect(store.state.blockedIris).toStrictEqual(Config.XmlSchemaDatatypes);
  });

  it("can logoutCurrentUser ___ 200", async () => {
    AuthService.signOut = vi.fn().mockResolvedValue(new CustomAlert(200, "logout successful"));
    LoggerService.error = vi.fn();
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
    LoggerService.error = vi.fn();
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
    LoggerService.info = vi.fn();
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
    expect(LoggerService.info).toBeCalledTimes(1);
    expect(LoggerService.info).toBeCalledWith(undefined, "Force logout successful");
  });

  it("can authenticateCurrentUser___ 403 ___ logout 400", async () => {
    AuthService.getCurrentAuthenticatedUser = vi.fn().mockResolvedValue(new CustomAlert(403, "user authenticated"));
    AuthService.signOut = vi.fn().mockResolvedValue(new CustomAlert(400, "logout failed"));
    LoggerService.error = vi.fn();
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
    expect(LoggerService.error).toBeCalledTimes(1);
    expect(LoggerService.error).toBeCalledWith(undefined, "Force logout failed");
  });
});
