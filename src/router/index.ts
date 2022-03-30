import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Editor from "../views/Editor.vue";
import Mapper from "../views/Mapper.vue";
import { SnomedLicense, Env } from "im-library";
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
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
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
  if (to.matched.some(record => record.meta.requiresAuth)) {
    await store.dispatch("authenticateCurrentUser").then(res => {
      console.log("auth guard user authenticated:" + res.authenticated);
      if (!res.authenticated) {
        console.log("redirecting to login");
        window.location.href = Env.authUrl + "login?returnUrl=" + currentUrl;
      } else {
        if (to.matched.some(record => record.meta.requiresLicense)) {
          console.log("snomed license accepted:" + store.state.snomedLicenseAccepted);
          if (store.state.snomedLicenseAccepted !== "true") {
            next({
              path: "/snomedLicense"
            });
          } else {
            next();
          }
        }
      }
    });
  } else {
    next();
  }
});

router.afterEach(to => {
  nextTick(() => {
    document.title = (to.meta.title as string) || APP_TITLE;
  });
});

export default router;
