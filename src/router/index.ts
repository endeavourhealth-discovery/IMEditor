import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Editor from "../views/Editor.vue";
import Creator from "../views/Creator.vue";
import TypeSelector from "@/components/creator/TypeSelector.vue";
import StepsGroup from "@/components/creator/StepsGroup.vue";
import { AccessDenied, SnomedLicense, Services, PageNotFound, EntityNotFound, Helpers, Config } from "im-library";
import Workflow from "../views/Workflow.vue";
import TaskDefinition from "../components/workflow/TaskDefinition.vue";
import TaskViewer from "../components/workflow/TaskViewer.vue";
import Mapper from "../views/Mapper.vue";
const { Env } = Services;

import store from "@/store/index";
import axios from "axios";
import { nextTick } from "vue";
const { EntityService } = Services;

const {
  DataTypeCheckers: { isObjectHasKeys },
  Converters: { urlToIri }
} = Helpers;

const entityService = new EntityService(axios);

const APP_TITLE = "IM Editor";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/creator",
    name: "Creator",
    component: Creator,
    meta: {
      requiresAuth: true
    },
    children: [{ path: "type", name: "TypeSelector", component: TypeSelector }]
  },
  {
    path: "/editor/:selectedIri?",
    name: "Editor",
    component: Editor,
    meta: {
      requiresAuth: true,
      requiresLicense: true
    },
    children: []
  },
  {
    path: "/workflow",
    name: "Workflow",
    component: Workflow,
    meta: {
      requiresAuth: true,
      requiresLicense: true
    },
    children: [
      {
        path: "task",
        name: "TaskDefinition",
        component: TaskDefinition
      },
      {
        path: "tasks",
        name: "TaskViewer",
        component: TaskViewer
      }
    ]
  },
  {
    path: "/mapper",
    name: "Mapper",
    component: Mapper,
    meta: {
      requiresAuth: true,
      requiresLicense: true
    }
  },
  {
    path: "/snomedLicense",
    name: "License",
    component: SnomedLicense
  },
  {
    path: "/401",
    name: "AccessDenied",
    component: AccessDenied
  },
  {
    path: "/404",
    name: "EntityNotFound",
    component: EntityNotFound
  },
  {
    path: "/:pathMatch(.*)*",
    name: "PageNotFound",
    component: PageNotFound
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach(async (to, from) => {
  const currentUrl = Env.EDITOR_URL + to.path.slice(1);
  if (to.path !== "/snomedLicense") {
    store.commit("updateSnomedReturnUrl", currentUrl);
    store.commit("updateAuthReturnUrl", currentUrl);
  }
  const iri = to.params.selectedIri;
  if (iri && typeof iri === "string" && Config.XmlSchemaDatatypes.includes(iri)) {
    return false;
  }
  if (to.name?.toString() == "Editor" && iri && typeof iri === "string") {
    if (iri) store.commit("updateEditorIri", iri);
    try {
      if (!(await entityService.iriExists(urlToIri(iri)))) {
        router.push({ name: "EntityNotFound" });
      }
    } catch (_error) {
      router.push({ name: "EntityNotFound" });
    }
  }
  if (to.matched.some((record: any) => record.meta.requiresAuth)) {
    const res = await store.dispatch("authenticateCurrentUser");
    console.log("auth guard user authenticated: " + res.authenticated);
    if (!res.authenticated) {
      console.log("redirecting to login");
      window.location.href = Env.AUTH_URL + "login?returnUrl=" + currentUrl;
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

  if (to.name === "PageNotFound" && to.path.startsWith("/creator/")) {
    router.push({ name: "Creator" });
  }
  if (to.name === "PageNotFound" && to.path.startsWith("/editor/")) {
    const urlSections = to.path.split("/");
    if (urlSections.length > 2) {
      const selectedIriParam = to.path.split("/")[2];
      if (!selectedIriParam) router.push({ name: "EntityNotFound" });
      else router.push({ name: "Editor", params: { selectedIri: urlToIri(selectedIriParam) } });
    } else router.push({ name: "Editor" });
  }

  return true;
});

router.afterEach(to => {
  nextTick(() => {
    document.title = (to.meta.title as string) || APP_TITLE;
  });
});

export default router;
