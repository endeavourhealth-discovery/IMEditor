import { createStore } from "vuex";
import { HistoryItem, Namespace, EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";
import { Models } from "im-library";
const { User, CustomAlert } = Models;
import AuthService from "@/services/AuthService";
import vm from "@/main";

import { HistoryItem, Namespace, EntityReferenceNode, RecentActivityItem, FilterDefaultsConfig } from "im-library/dist/types/interfaces/Interfaces";
import { Models, LoggerService, Vocabulary } from "im-library";
const { User, CustomAlert } = Models;
import AuthService from "@/services/AuthService";
import ConfigService from "@/services/ConfigService";
import EntityService from "@/services/EntityService";
const { IM, RDF, RDFS } = Vocabulary;
export default createStore({
  // update stateType.ts when adding new state!
  state: {
    arrayObjectNameListboxWithLabelStartExpanded: [],
    defaultPredicateNames: {} as any,
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
    blockedIris: [] as string[],
    tagSeverityMatches: [
      { "@id": IM.ACTIVE, severity: "success" },
      { "@id": IM.DRAFT, severity: "warning" },
      { "@id": IM.INACTIVE, severity: "danger" }
    ],
    textDefinitionStartExpanded: ["Definition"],
    filterOptions: {
      status: [] as EntityReferenceNode[],
      schemes: [] as Namespace[],
      types: [] as EntityReferenceNode[]
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
    updateBlockedIris(state, blockedIris) {
      state.blockedIris = blockedIris;
    },
    updateHistory(state, historyItem) {
      state.history = state.history.filter(function(el) {
        return el.conceptName !== historyItem.conceptName;
      });
      state.history.splice(0, 0, historyItem);
    },
    updateDefaultPredicateNames(state, names) {
      state.defaultPredicateNames = names;
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
    async fetchBlockedIris({ commit }) {
      const blockedIris = await vm.$configService.getXmlSchemaDataTypes();
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
    async fetchFilterSettings({ commit, state }) {
      const configs = await ConfigService.getFilterDefaults();
      commit("updateFilterDefaults", configs);

      const schemeOptions = await EntityService.getNamespaces();
      const statusOptions = await EntityService.getEntityChildren(IM.STATUS);
      const typeOptions = (await EntityService.getPartialEntities(state.filterDefaults.typeOptions, [RDFS.LABEL])).map(typeOption => {
        return { "@id": typeOption["@id"], name: typeOption[RDFS.LABEL] };
      });
      commit("updateFilterOptions", {
        status: statusOptions,
        schemes: schemeOptions,
        types: typeOptions
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
