import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Editor from "../views/Editor.vue";
import Creator from "../views/Creator.vue";
import TypeSelector from "@/components/creator/TypeSelector.vue";
import SummaryEditor from "@/components/edit/SummaryEditor.vue";
import ParentsEditor from "@/components/edit/ParentsEditor.vue";
import MemberEditor from "@/components/edit/MemberEditor.vue";
import { AccessDenied, SnomedLicense, Env, PageNotFound, EntityNotFound, Helpers } from "im-library";
import MapperWizard from "../views/MapperWizard.vue";
import TaskDefinition from "../components/mapper/TaskDefinition.vue";
import TaskSelection from "../components/mapper/TaskSelection.vue";
import TaskViewer from "../components/mapper/TaskViewer.vue";
import EntityMatcher from "../components/mapper/EntityMatcher.vue";
import EntityMapper from "../components/mapper/EntityMapper.vue";
import MappingConfirmation from "../components/mapper/MappingConfirmation.vue";

import store from "@/store/index";
import { nextTick } from "vue";
import EntityService from "@/services/EntityService";
const {
  DataTypeCheckers: { isObjectHasKeys }
} = Helpers;

const APP_TITLE = "IM Editor";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/creator",
    name: "Creator",
    component: Creator,
    meta: {
      requiresAuth: true
    },
    redirect: { name: "TypeSelector" },
    children: [
      { path: "type", name: "TypeSelector", component: TypeSelector },
      { path: "summary", name: "Summary", component: SummaryEditor },
      { path: "parents", name: "Parents", component: ParentsEditor },
      { path: "members", name: "Members", component: MemberEditor }
    ]
  },
  {
    path: "/editor/:selectedIri?",
    name: "Editor",
    component: Editor,
    meta: {
      requiresAuth: true,
      requiresLicense: true
    }
  },
  {
    path: "/task",
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
        path: "view",
        name: "TaskViewer",
        component: TaskViewer
      },
      {
        path: "mapper",
        name: "EntityMapper",
        component: EntityMapper
      }
    ]
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
  const iri = to.params.selectedIri as string;
  if (iri && store.state.blockedIris.includes(iri)) {
    return false;
  }
  if (to.name?.toString() == "Editor") {
    if (iri) store.commit("updateEditorIri", iri);
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

  if (to.name === "Editor" && isObjectHasKeys(to.params, ["selectedIri"])) {
    const iri = to.params.selectedIri as string;
    try {
      new URL(iri);
      if (!(await EntityService.iriExists(iri))) {
        router.push({ name: "EntityNotFound" });
      }
    } catch (_error) {
      router.push({ name: "EntityNotFound" });
    }
  }

  return true;
});

router.afterEach(to => {
  nextTick(() => {
    document.title = (to.meta.title as string) || APP_TITLE;
  });
});

export default router;
