import router from "@/router/index";
import App from "@/App.vue";
import Toast from "primevue/toast";
import store from "@/store/index";
import { flushPromises, shallowMount } from "@vue/test-utils";

describe("router", () => {
  beforeEach(() => {
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });
  describe("router ___ no snomed", () => {
    let wrapper;

    beforeEach(async () => {
      jest.resetAllMocks();
      window.sessionStorage.clear();
      store.commit("updateSnomedLicenseAccepted", "false");
      store.dispatch = jest.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store]
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      jest.clearAllMocks();
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

    beforeEach(async () => {
      jest.resetAllMocks();
      window.sessionStorage.clear();
      store.commit("updateSnomedLicenseAccepted", "true");
      store.dispatch = jest.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store]
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      jest.clearAllMocks();
    });

    it("routes to home if snomedAccepted ___ true", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(wrapper.vm.$route.path).toBe("/editor/http:%2F%2Fsnomed.info%2Fsct%23298382003");
    });
  });

  describe("router ___ no auth", () => {
    let wrapper;

    beforeEach(async () => {
      jest.resetAllMocks();
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      store.dispatch = jest.fn().mockResolvedValue({ authenticated: false });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store]
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      jest.clearAllMocks();
    });

    it("routes to login if auth false", async () => {
      let mockLocation = { href: "" };
      let location = window.location;
      delete window.location;
      window.location = mockLocation;
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(window.location.href).toBe(import.meta.env.VITE_AUTH_URL + "login?returnUrl=VITE_EDITOR");
      window.location = location;
    });
  });

  describe("router ___ auth", () => {
    let wrapper;

    beforeEach(async () => {
      jest.resetAllMocks();
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      store.dispatch = jest.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store]
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      jest.clearAllMocks();
    });

    it("routes to path if auth true", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(wrapper.vm.$route.path).toBe("/editor/http:%2F%2Fsnomed.info%2Fsct%23298382003");
    });
  });

  describe("router ___ blockedIri", () => {
    let wrapper;

    beforeEach(async () => {
      jest.resetAllMocks();
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      store.state.blockedIris = ["http://www.w3.org/2001/XMLSchema#string"];
      store.dispatch = jest.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store]
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      jest.clearAllMocks();
    });

    it("doesn't route if iri is blocked", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://www.w3.org/2001/XMLSchema#string" } });
      await flushPromises();
      expect(wrapper.vm.$route.path).toBe("/");
    });
  });

  describe("router ___ entity", () => {
    let wrapper;

    beforeEach(async () => {
      jest.resetAllMocks();
      window.sessionStorage.clear();
      store.state.snomedLicenseAccepted = "true";
      store.commit = jest.fn();
      store.dispatch = jest.fn().mockResolvedValue({ authenticated: true });
      router.push("/");
      await router.isReady();

      wrapper = shallowMount(App, {
        global: {
          components: { Toast },
          plugins: [router, store]
        }
      });

      await flushPromises();
      await wrapper.vm.$nextTick();
      jest.clearAllMocks();
    });

    it("updates editorIri on entity routing", async () => {
      router.push({ name: "Editor", params: { selectedIri: "http://snomed.info/sct#298382003" } });
      await flushPromises();
      expect(store.commit).toHaveBeenCalledTimes(1);
      expect(store.commit).toHaveBeenCalledWith("updateEditorIri", "http://snomed.info/sct#298382003");
      expect(wrapper.vm.$route.path).toBe("/editor/http:%2F%2Fsnomed.info%2Fsct%23298382003");
    });
  });
});
