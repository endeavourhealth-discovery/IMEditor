import { createStore } from "vuex";
import AuthService from "@/services/AuthService";
import vm from "@/main";
import { HistoryItem, Namespace, EntityReferenceNode, RecentActivityItem, FilterDefaultsConfig } from "im-library/dist/types/interfaces/Interfaces";
import { Config, Models, Vocabulary } from "im-library";
const { IM, RDF, RDFS } = Vocabulary;
const { User, CustomAlert } = Models;
export default createStore({
  // update stateType.ts when adding new state!
  state: {
    arrayObjectNameListboxWithLabelStartExpanded: [],
    history: [] as HistoryItem[],
    recentLocalActivity: JSON.parse(localStorage.getItem("recentLocalActivity") || "[]") as RecentActivityItem[],
    currentUser: {} as Models.User,
    filterDefaults: {} as FilterDefaultsConfig,
    isLoggedIn: false as boolean,
    snomedLicenseAccepted: localStorage.getItem("snomedLicenseAccepted") as string,
    editorIri: localStorage.getItem("editorSelectedIri") as string,
    snomedReturnUrl: "",
    authReturnUrl: "",
    editorSavedEntity: localStorage.getItem("editorUpdatedEntity") as any,
    tagSeverityMatches: [
      { "@id": IM.ACTIVE, severity: "success" },
      { "@id": IM.DRAFT, severity: "warning" },
      { "@id": IM.INACTIVE, severity: "danger" }
    ],
    textDefinitionStartExpanded: ["Definition"],
    filterOptions: {
      status: [] as EntityReferenceNode[],
      schemes: [] as Namespace[],
      types: [] as EntityReferenceNode[],
      sortFields: [] as { label: string; value: any }[],
      sortDirections: [] as { label: string; value: any }[]
    },
    selectedFilters: {
      status: [] as EntityReferenceNode[],
      schemes: [] as Namespace[],
      types: [] as EntityReferenceNode[],
      sortField: "",
      sortDirection: ""
    },
    quickFiltersStatus: new Map<string, boolean>(),
    creatorInvalidEntity: false,
    creatorValidity: [] as { key: string; valid: boolean }[],
    editorInvalidEntity: false,
    editorValidity: [] as { key: string; valid: boolean }[],
    refreshTree: false as boolean
  },
  mutations: {
    updateRecentLocalActivity(state, recentActivityItem: RecentActivityItem) {
      let activity: RecentActivityItem[] = JSON.parse(localStorage.getItem("recentLocalActivity") || "[]");
      activity.forEach(activityItem => {
        activityItem.dateTime = new Date(activityItem.dateTime);
      });
      const foundIndex = activity.findIndex(activityItem => activityItem.iri === recentActivityItem.iri && activityItem.app === recentActivityItem.app);
      if (foundIndex !== -1) {
        activity[foundIndex].dateTime = recentActivityItem.dateTime;
        activity.sort((a, b) => {
          if (a.dateTime.getTime() > b.dateTime.getTime()) {
            return 1;
          } else if (b.dateTime.getTime() > a.dateTime.getTime()) {
            return -1;
          } else {
            return 0;
          }
        });
      } else {
        while (activity.length > 4) activity.shift();
        activity.push(recentActivityItem);
      }

      localStorage.setItem("recentLocalActivity", JSON.stringify(activity));
      state.recentLocalActivity = activity;
    },
    updateHistory(state, historyItem) {
      state.history = state.history.filter(function (el) {
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
    updateQuickFiltersStatus(state, status) {
      state.quickFiltersStatus.set(status.key, status.value);
    },
    updateCurrentUser(state, user) {
      state.currentUser = user;
    },
    updateIsLoggedIn(state, status) {
      state.isLoggedIn = status;
    },
    updateSelectedFilters(state, filters) {
      state.selectedFilters = filters;
    },
    updateSnomedLicenseAccepted(state, status: string) {
      state.snomedLicenseAccepted = status;
      localStorage.setItem("snomedLicenseAccepted", status);
    },
    updateEditorIri(state, iri) {
      state.editorIri = iri;
      localStorage.setItem("editorSelectedIri", iri);
    },
    updateSnomedReturnUrl(state, url) {
      state.snomedReturnUrl = url;
    },
    updateAuthReturnUrl(state, url) {
      state.authReturnUrl = url;
    },
    updateEditorSavedEntity(state, entity) {
      state.editorSavedEntity = entity;
      localStorage.setItem("editorSavedEntity", entity);
    },
    updateFilterDefaults(state, defaults) {
      state.filterDefaults = defaults;
    },
    updateRefreshTree(state) {
      state.refreshTree = !state.refreshTree;
    },
    updateCreatorInvalidEntity(state, bool) {
      state.creatorInvalidEntity = bool;
    },
    updateCreatorValidity(state, data) {
      state.creatorValidity = data;
    },
    updateEditorInvalidEntity(state, bool) {
      state.editorInvalidEntity = bool;
    },
    updateEditorValidity(state, data) {
      state.editorValidity = data;
    }
  },
  actions: {
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
    async fetchFilterSettings({ commit, state }) {
      const filterDefaults = await vm.$entityService.getFilterOptions();
      commit("updateFilterOptions", {
        status: filterDefaults.status,
        schemes: filterDefaults.schemes,
        types: filterDefaults.types,
        sortFields: filterDefaults.sortFields,
        sortDirections: filterDefaults.sortDirections
      });

      const selectedStatus = state.filterOptions.status.filter((item: EntityReferenceNode) =>
        Config.Values.FILTER_DEFAULTS.statusOptions.includes(item["@id"])
      );
      const selectedSchemes = state.filterOptions.schemes.filter((item: Namespace) => Config.Values.FILTER_DEFAULTS.schemeOptions.includes(item.iri));
      const selectedTypes = state.filterOptions.types.filter((item: EntityReferenceNode) => Config.Values.FILTER_DEFAULTS.typeOptions.includes(item["@id"]));
      commit("updateSelectedFilters", {
        status: selectedStatus,
        schemes: selectedSchemes,
        types: selectedTypes
      });
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
              vm.$loggerService.info(undefined, "Force logout successful");
            } else {
              vm.$loggerService.error(undefined, "Force logout failed");
            }
          });
        }
      });
      return result;
    }
  },
  modules: {}
});
