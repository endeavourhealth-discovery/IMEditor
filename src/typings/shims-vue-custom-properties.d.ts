import { ConfigService, EntityService, Env, LoggerService, QueryService, SetService } from "im-library/dist/types/services/Services";
import { ComponentCustomProperties } from "vue";
import Swal from "sweetalert2";
import { Store } from "vuex";
import State from "@/store/stateType";

declare module "@vue/runtime-core" {
  interface ComponentCustomProperties {
    $entityService: EntityService;
    $configService: ConfigService;
    $env: Env;
    $loggerService: typeof LoggerService;
    $queryService: QueryService;
    $setService: SetService;
    $swal: typeof Swal;
    $store: Store<State>;
  }
}
