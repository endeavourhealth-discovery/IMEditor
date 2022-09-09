import { flushPromises, shallowMount } from "@vue/test-utils";
import App from "@/App.vue";
import Toast from "primevue/toast";
import ProgressSpinner from "primevue/progressspinner";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, vi } from "vitest";
import { createStore } from "vuex";

describe("App.vue", () => {
  let wrapper;
  let mockStore;
  const actions = { authenticateCurrentUser: vi.fn(), fetchFilterSettings: vi.fn() };

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

  beforeEach(() => {
    vi.resetAllMocks();
    mockStore = createStore({
      actions: actions
    });
    wrapper = shallowMount(App, {
      global: {
        components: { Toast, ProgressSpinner },
        stubs: ["router-link", "router-view"],
        plugins: [mockStore]
      }
    });
  });

  it("should check auth and update blockedIris on mount", async () => {
    await flushPromises();
    expect(actions.authenticateCurrentUser).toHaveBeenCalledTimes(1);
    expect(actions.fetchFilterSettings).toHaveBeenCalledTimes(1);
  });
});
