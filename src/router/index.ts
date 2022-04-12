import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Editor from "../views/Editor.vue";
import { SnomedLicense, Env } from "im-library";
import MapperWizard from "../views/MapperWizard.vue";
import TaskDefinition from "../components/mapper/TaskDefinition.vue";
import TaskSelection from "../components/mapper/TaskSelection.vue";
import EntityMatcher from "../components/mapper/EntityMatcher.vue";
import MappingConfirmation from "../components/mapper/MappingConfirmation.vue";

import store from "@/store/index";
import { nextTick } from "vue";

const APP_TITLE = "IM Editor";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Home",
    component: Editor,
    // redirect: {name: "Creator"},
    children: [
      // {
      //   path: "/editor",
      //   name: "Creator",
      //   component: Creator
      // meta: {
      //   requiresAuth: true
      // }
      // },
      {
        path: "/editor/:selectedIri",
        name: "Editor",
        component: Editor,
        meta: {
          requiresAuth: true,
          requiresLicense: true
        }
      }
    ]
    // meta: {
    //   requiresAuth: true
    // }
  },
  {
    path: "/mapper",
    name: "MapperWizard",
    component: MapperWizard,
    meta: {
      requiresAuth: true,
      requiresLicense: true
    },
    children: [
      {
        path: "definition",
        name: "TaskDefinition",
        component: TaskDefinition
      },
      {
        path: "selection",
        name: "TaskSelection",
        component: TaskSelection
      },
      {
        path: "match",
        name: "EntityMatcher",
        component: EntityMatcher
      },
      {
        path: "confirmation",
        name: "MappingConfirmation",
        component: MappingConfirmation
      }
    ]
  },
  {
    path: "/snomedLicense",
    name: "License",
    component: SnomedLicense
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach(async (to, from) => {
  const currentUrl = Env.editorUrl + "#" + to.path;
  if (to.path !== "/snomedLicense") {
    store.commit("updateSnomedReturnUrl", currentUrl);
    store.commit("updateAuthReturnUrl", currentUrl);
  }
  const iri = to.params.selectedIri as string;
  if (iri && store.state.blockedIris.includes(iri)) {
    return false;
  }
  if (to.name?.toString() == "Editor") {
    store.commit("updateEditorIri", iri);
  }
  if (to.matched.some((record: any) => record.meta.requiresAuth)) {
    const res = await store.dispatch("authenticateCurrentUser");
    console.log("auth guard user authenticated: " + res.authenticated);
    if (!res.authenticated) {
      console.log("redirecting to login");
      window.location.href = Env.authUrl + "login?returnUrl=" + currentUrl;
    }
  }
  if (to.matched.some((record: any) => record.meta.requiresLicense)) {
    console.log("snomed license accepted:" + store.state.snomedLicenseAccepted);
    if (store.state.snomedLicenseAccepted !== "true") {
      return {
        path: "/snomedLicense"
      };
    }
  }
});

router.afterEach(to => {
  nextTick(() => {
    document.title = (to.meta.title as string) || APP_TITLE;
  });
});

export default router;
