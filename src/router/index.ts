import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Editor from "../views/Editor.vue";
import { SnomedLicense, Env, Helpers } from "im-library";
import store from "@/store/index";
import { nextTick } from "vue";
const {
  RouterGuards: { checkAuth, checkLicense }
} = Helpers;

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
    path: "/snomedLicense",
    name: "License",
    component: SnomedLicense
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  let hasCalledNext = false;
  const currentUrl = Env.editorUrl + "#" + to.path;
  if (to.path !== "/snomedLicense") {
    store.commit("updateSnomedReturnUrl", currentUrl);
    store.commit("updateAuthReturnUrl", currentUrl);
  }
  const iri = to.params.selectedIri as string;
  if (iri && store.state.blockedIris.includes(iri)) {
    return;
  }
  if (to.name?.toString() == "Editor") {
    store.commit("updateEditorIri", iri);
  }
  hasCalledNext = await checkAuth(to, next, store, hasCalledNext, currentUrl);
  hasCalledNext = checkLicense(to, next, store, hasCalledNext);
  if (!hasCalledNext) next();
});

router.afterEach(to => {
  nextTick(() => {
    document.title = (to.meta.title as string) || APP_TITLE;
  });
});

export default router;
