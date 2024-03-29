import { ConfigService, EntityService, Env, LoggerService, QueryService, SetService } from "im-library/dist/types/services/Services";
import type { InjectionKey, Ref } from "vue";
import { Store } from "vuex";
import Swal from "sweetalert2";
import State from "@/store/stateType";
import { RouteLocationNormalizedLoaded, Router } from "vue-router";
const $entityService = Symbol("$entityService") as InjectionKey<EntityService>;
const $store = Symbol("$store") as InjectionKey<Store<State>>;
const $env = Symbol("$env") as InjectionKey<typeof Env>;
const $loggerService = Symbol("$loggerService") as InjectionKey<typeof LoggerService>;
const $queryService = Symbol("$queryService") as InjectionKey<QueryService>;
const $swal = Symbol("$swal") as InjectionKey<typeof Swal>;
const $configService = Symbol("$configService") as InjectionKey<ConfigService>;
const $setService = Symbol("$setSetvice") as InjectionKey<SetService>;
const $router = Symbol("$router") as InjectionKey<Router>;
const $route = Symbol("$route") as InjectionKey<RouteLocationNormalizedLoaded>;
const editorValidity = Symbol("editorValidity") as InjectionKey<{
  validity: Ref<{ key: string; valid: boolean }[]>;
  updateValidity: Function;
  removeValidity: Function;
}>;
const editorEntity = Symbol("editorEntity") as InjectionKey<{ editorEntity: Ref<any>; updateEntity: Function; deleteEntityKey: Function }>;
const valueVariableMap = Symbol("valueVariableMap") as InjectionKey<{ valueVariableMap: Ref<Map<string, any>>; updateValueVariableMap: Function }>;

export default {
  $entityService,
  $store,
  $configService,
  $env,
  $loggerService,
  $queryService,
  $swal,
  $router,
  $setService,
  $route,
  editorValidity,
  editorEntity,
  valueVariableMap
};
