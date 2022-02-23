import { createStore } from "vuex";
import { HistoryItem, Namespace, EntityReferenceNode } from "im-library/src/interfaces/Interfaces";
import { Models } from "im-library";
const { User, CustomAlert } = Models;
import AuthService from "@/services/AuthService";
import LoggerService from "@/services/LoggerService";
import ConfigService from "@/services/ConfigService";

export default createStore({
  // update stateType.ts when adding new state!
  state: {
    history: [] as HistoryItem[],
    currentUser: {} as typeof User,
    isLoggedIn: false as boolean,
    snomedLicenseAccepted: localStorage.getItem("snomedLicenseAccepted") as string,
    editorIri: localStorage.getItem("editorSelectedIri") as string,
    editorSavedEntity: localStorage.getItem("editorUpdatedEntity") as any,
    blockedIris: [] as string[],
    filterOptions: {
      status: [] as EntityReferenceNode[],
      schemes: [] as Namespace[],
      types: [] as EntityReferenceNode[]
    },
    selectedFilters: {
      status: [] as EntityReferenceNode[],
      schemes: [] as Namespace[],
      types: [] as EntityReferenceNode[]
    },
    quickFiltersStatus: new Map<string, boolean>()
  },
  mutations: {
    updateBlockedIris(state, blockedIris) {
      state.blockedIris = blockedIris;
    },
    updateHistory(state, historyItem) {
      state.history = state.history.filter(function(el) {
        return el.conceptName !== historyItem.conceptName;
      });
      state.history.splice(0, 0, historyItem);
    },
    updateFilterOptions(state, filters) {
      filters.types.forEach((type: any) => {
        delete type.hasChildren;
        delete type.type;
      });
      filters.status.forEach((item: any) => {
        delete item.hasChildren;
        delete item.type;
      });
      state.filterOptions = filters;
    },
    updateSelectedFilters(state, filters) {
      state.selectedFilters = filters;
    },
    updateQuickFiltersStatus(state, status) {
      state.quickFiltersStatus.set(status.key, status.value);
    },
    updateCurrentUser(state, user) {
      state.currentUser = user;
    },
    updateIsLoggedIn(state, status) {
      state.isLoggedIn = status;
    },
    updateSnomedLicenseAccepted(state, status: string) {
      state.snomedLicenseAccepted = status;
      localStorage.setItem("snomedLicenseAccepted", status);
    },
    updateEditorIri(state, iri) {
      localStorage.setItem("editorSelectedIri", iri);
    },
    updateEditorSavedEntity(state, entity) {
      localStorage.setItem("editorSavedEntity", entity);
    }
  },
  actions: {
    async fetchBlockedIris({ commit }) {
      const blockedIris = await ConfigService.getXmlSchemaDataTypes();
      commit("updateBlockedIris", blockedIris);
    },
    async logoutCurrentUser({ commit }) {
      let result = new CustomAlert(500, "Logout (store) failed");
      await AuthService.signOut().then(res => {
        if (res.status === 200) {
          commit("updateCurrentUser", null);
          commit("updateIsLoggedIn", false);
          result = res;
        } else {
          result = res;
        }
      });
      return result;
    },
    async authenticateCurrentUser({ commit, dispatch }) {
      const result = { authenticated: false };
      await AuthService.getCurrentAuthenticatedUser().then(res => {
        if (res.status === 200 && res.user) {
          commit("updateIsLoggedIn", true);
          const loggedInUser = res.user;
          commit("updateCurrentUser", loggedInUser);
          result.authenticated = true;
        } else {
          dispatch("logoutCurrentUser").then(resLogout => {
            if (resLogout.status === 200) {
              LoggerService.info(undefined, "Force logout successful");
            } else {
              LoggerService.error(undefined, "Force logout failed");
            }
          });
        }
      });
      return result;
    }
  },
  modules: {}
});
