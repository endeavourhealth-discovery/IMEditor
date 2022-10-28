import { flushPromises, shallowMount } from "@vue/test-utils";
import App from "@/App.vue";
import Toast from "primevue/toast";
import ProgressSpinner from "primevue/progressspinner";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, vi } from "vitest";
import * as vuex from "vuex";

vi.mock("vuex", () => ({
  useStore: () => ({
    dispatch: mockDispatch
  })
}));

const mockDispatch = vi.fn();

const mockAdd = vi.fn();

const mockPush = vi.fn();
const mockGo = vi.fn();
const mockRoute = { name: "Concept" };

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mockPush,
    go: mockGo
  }),
  useRoute: () => mockRoute
}));

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({
    add: mockAdd
  })
}));

describe("App.vue", () => {
  let wrapper;

  beforeEach(() => {
    vi.resetAllMocks();
    wrapper = shallowMount(App, {
      global: {
        components: { Toast, ProgressSpinner },
        stubs: ["router-link", "router-view", "ReleaseNotes"]
      }
    });
  });

  it("should check auth and update blockedIris on mount", async () => {
    await flushPromises();
    expect(mockDispatch).toHaveBeenCalledTimes(2);
    expect(mockDispatch).toHaveBeenNthCalledWith(1, "authenticateCurrentUser");
    expect(mockDispatch).toHaveBeenNthCalledWith(2, "fetchFilterSettings");
  });
});
