import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Editor from "../views/Editor.vue";
import Creator from "../views/Creator.vue";
import TypeSelector from "@/components/creator/TypeSelector.vue";
import SummaryEditor from "@/components/edit/SummaryEditor.vue";
import ParentsEditor from "@/components/edit/ParentsEditor.vue";
import { SnomedLicense, Env } from "im-library";
import store from "@/store/index";
import { nextTick } from "vue";

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
      { path: "parents", name: "Parents", component: ParentsEditor }
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
    if (iri) store.commit("updateEditorIri", iri);
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
  return true;
});

router.afterEach(to => {
  nextTick(() => {
    document.title = (to.meta.title as string) || APP_TITLE;
  });
});

export default router;
