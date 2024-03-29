import router from "@/router/index";
import App from "@/App.vue";
import Toast from "primevue/toast";
import store from "@/store/index";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, vi } from "vitest";
import { Services } from "im-library";
const { EntityService, Env } = Services;

const mockAdd = vi.fn();

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({
    add: mockAdd
  })
}));

describe("router", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });
  describe("router ___ no snomed", () => {
    let wrapper;
    let iriExistsSpy;

    beforeEach(async () => {
      vi.resetAllMocks();
      window.sessionStorage.clear();
      iriExistsSpy = vi.spyOn(EntityService.prototype, "iriExists").mockResolvedValue(true);
      store.commit("updateSnomedLicenseAccepted", "false");
      store.dispatch = vi.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store],
          stubs: { ReleaseNotes: true }
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      vi.clearAllMocks();
    });

    it("routes to snomedLicense if snomedAccepted ___ false", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(wrapper.vm.$route.path).toBe("/snomedLicense");
      store.commit("updateSnomedLicenseAccepted", "true");
    });
  });

  describe("router ___ snomed", () => {
    let wrapper;
    let iriExistsSpy;

    beforeEach(async () => {
      vi.resetAllMocks();
      window.sessionStorage.clear();
      iriExistsSpy = vi.spyOn(EntityService.prototype, "iriExists").mockResolvedValue(true);
      store.commit("updateSnomedLicenseAccepted", "true");
      store.dispatch = vi.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store],
          stubs: { ReleaseNotes: true }
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      vi.clearAllMocks();
    });

    it("routes to home if snomedAccepted ___ true", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(store.state.editorIri).toBe("http://snomed.info/sct#298382003");
      expect(wrapper.vm.$route.path).toBe("/editor/http:%2F%2Fsnomed.info%2Fsct%23298382003");
    });
  });

  describe("router ___ no auth", () => {
    let wrapper;
    let iriExistsSpy;

    beforeEach(async () => {
      vi.resetAllMocks();
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      iriExistsSpy = vi.spyOn(EntityService.prototype, "iriExists").mockResolvedValue(true);
      store.dispatch = vi.fn().mockResolvedValue({ authenticated: false });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store],
          stubs: { ReleaseNotes: true }
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      vi.clearAllMocks();
    });

    it("routes to login if auth false", async () => {
      let mockLocation = { href: "" };
      let location = window.location;
      delete window.location;
      window.location = mockLocation;
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(window.location.href).toBe(Env.AUTH_URL + "login?returnUrl=" + Env.EDITOR_URL + "editor/http:%2F%2Fsnomed.info%2Fsct%23298382003");
      window.location = location;
    });
  });

  describe("router ___ auth", () => {
    let wrapper;
    let iriExistsSpy;

    beforeEach(async () => {
      vi.resetAllMocks();
      iriExistsSpy = vi.spyOn(EntityService.prototype, "iriExists").mockResolvedValue(true);
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      store.dispatch = vi.fn().mockResolvedValue({ authenticated: true });
      store.commit = vi.fn();
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store],
          stubs: { ReleaseNotes: true }
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      vi.clearAllMocks();
    });

    it("routes to path if auth true", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(store.commit).toHaveBeenCalledWith("updateEditorIri", "http://snomed.info/sct#298382003");
      expect(wrapper.vm.$route.path).toBe("/editor/http:%2F%2Fsnomed.info%2Fsct%23298382003");
    });
  });

  describe("router ___ blockedIri", () => {
    let wrapper;
    let iriExistsSpy;

    beforeEach(async () => {
      vi.resetAllMocks();
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      iriExistsSpy = vi.spyOn(EntityService.prototype, "iriExists").mockResolvedValue(true);
      store.state.blockedIris = ["http://www.w3.org/2001/XMLSchema#string"];
      store.dispatch = vi.fn().mockResolvedValue({ authenticated: true });
      store.commit = vi.fn();
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store],
          stubs: { ReleaseNotes: true }
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      vi.clearAllMocks();
    });

    it("doesn't route if iri is blocked", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://www.w3.org/2001/XMLSchema#string" } });
      await flushPromises();
      expect(store.commit).not.toHaveBeenCalledWith("updateEditorIri", "http://www.w3.org/2001/XMLSchema#string");
      expect(wrapper.vm.$route.path).toBe("/");
    });
  });

  describe("router ___ entity", () => {
    let wrapper;
    let iriExistsSpy;

    beforeEach(async () => {
      vi.resetAllMocks();
      iriExistsSpy = vi.spyOn(EntityService.prototype, "iriExists").mockResolvedValue(true);
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      store.commit = vi.fn();
      store.dispatch = vi.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store],
          stubs: { ReleaseNotes: true }
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      vi.clearAllMocks();
    });

    it("updates editorIri on entity routing", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(store.commit).toHaveBeenCalledWith("updateEditorIri", "http://snomed.info/sct#298382003");
      expect(wrapper.vm.$route.path).toBe("/editor/http:%2F%2Fsnomed.info%2Fsct%23298382003");
    });
  });
});
