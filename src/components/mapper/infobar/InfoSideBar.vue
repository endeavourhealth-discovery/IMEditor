<template>
  <div id="concept-empty-container" v-if="selectedConceptIri === 'http://endhealth.info/im#Favourites'">
    <Panel>
      <template #icons>
        <button class="p-panel-header-icon p-link mr-2" @click="closeBar">
          <span class="pi pi-times"></span>
        </button>
      </template>
      <template #header>
        Please select an item to display
      </template>
    </Panel>
  </div>
  <div id="concept-main-container" v-else>
    <Panel>
      <template #icons>
        <button class="p-panel-header-icon p-link mr-2" @click="closeBar">
          <span class="pi pi-times"></span>
        </button>
      </template>
      <template #header>
        <PanelHeader :types="types" :header="header" />
      </template>
      <div id="concept-content-dialogs-container">
        <div id="concept-panel-container">
          <TabView :lazy="true">
            <TabPanel header="Details">
              <div v-if="loading" class="loading-container" :style="contentHeight">
                <ProgressSpinner />
              </div>
              <div v-else class="concept-panel-content" id="definition-container" :style="contentHeight">
                <Definition :concept="concept" :configs="configs" :totalCount="totalCount" />
              </div>
            </TabPanel>
            <TabPanel v-if="terms" header="Terms">
              <div class="concept-panel-content" id="term-table-container" :style="contentHeight">
                <TermCodeTable :terms="terms" />
              </div>
            </TabPanel>
            <TabPanel header="Hierarchy position">
              <div class="concept-panel-content" id="secondary-tree-container" :style="contentHeight">
                <SecondaryTree :conceptIri="selectedConceptIri" />
              </div>
            </TabPanel>
          </TabView>
        </div>
      </div>
    </Panel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Definition from "./infoSideBar/Definition.vue";
import PanelHeader from "./infoSideBar/PanelHeader.vue";
import { DefinitionConfig, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { Vocabulary, Helpers, Models } from "im-library";
const { IM, RDF, RDFS } = Vocabulary;
const {
  ConceptTypeMethods: { isQuery },
  DataTypeCheckers: { isObjectHasKeys },
  ContainerDimensionGetters: { getContainerElementOptimalHeight },
  Sorters: { byOrder }
} = Helpers;

export default defineComponent({
  name: "InfoSideBar",
  emits: {
    closeBar: () => true
  },
  props: ["selectedConceptIri"],
  components: {
    PanelHeader,
    Definition
  },

  watch: {
    async selectedConceptIri() {
      if (this.selectedConceptIri) await this.init();
    }
  },
  async mounted() {
    this.setContentHeight();
    window.addEventListener("resize", this.onResize);
    await this.init();
    this.setContentHeight();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.onResize);
  },
  data() {
    return {
      loading: false,
      concept: {} as any,
      definitionText: "",
      types: [] as TTIriRef[],
      header: "",
      contentHeight: "",
      contentHeightValue: 0,
      configs: [] as DefinitionConfig[],
      conceptAsString: "",
      terms: [] as any[] | undefined,
      profile: {} as Models.Query.Profile,
      isQuery: false,
      children: {} as any,
      totalCount: 0
    };
  },
  methods: {
    closeBar() {
      this.$emit("closeBar");
    },
    onResize(): void {
      this.setContentHeight();
    },

    directToEditRoute(): void {
      this.$router.push({
        name: "Edit",
        params: { iri: this.concept["@id"] }
      });
    },

    directToCreateRoute(): void {
      this.$router.push({ name: "Create" });
    },

    async getConcept(iri: string): Promise<void> {
      const predicates = this.configs
        .filter((c: DefinitionConfig) => c.type !== "Divider")
        .filter((c: DefinitionConfig) => c.predicate !== "subtypes")
        .filter((c: DefinitionConfig) => c.predicate !== "inferred")
        .filter((c: DefinitionConfig) => c.predicate !== "termCodes")
        .filter((c: DefinitionConfig) => c.predicate !== "@id")
        .filter((c: DefinitionConfig) => c.predicate !== "None")
        .filter((c: DefinitionConfig) => c.predicate !== undefined)
        .map((c: DefinitionConfig) => c.predicate);
      predicates.push(IM.DEFINITION);

      this.concept = await this.$entityService.getPartialEntity(iri, predicates);

      this.concept["@id"] = iri;
      this.children = await this.$entityService.getPagedChildren(iri, 1, 10);
      this.totalCount = this.children["totalCount"];
      this.concept["subtypes"] = this.children.result;

      this.concept["termCodes"] = await this.$entityService.getEntityTermCodes(iri);

      await this.hydrateDefinition();

      if (isQuery(this.concept[RDF.TYPE])) {
        this.isQuery = true;
        this.profile = new Models.Query.Profile(this.concept);
      } else {
        this.isQuery = false;
        this.profile = {} as Models.Query.Profile;
      }
    },
    async hydrateDefinition() {
      if (this.concept[IM.DEFINITION]) {
        const def = this.concept[IM.DEFINITION];
        const iris: any[] = this.getIris(def);
        const ttiris = await this.$entityService.getNames(iris.map(i => i["@id"]));

        this.setIriNames(iris, ttiris);

        this.concept[IM.DEFINITION] = JSON.stringify(def);
      }
    },
    getIris(def: any): string[] {
      const result = [];

      for (const k of Object.keys(def)) {
        if (def[k]["@id"]) {
          result.push(def[k]);
        } else if (typeof def[k] === "object") {
          this.getIris(def[k]).forEach(i => result.push(i));
        }
      }

      return result;
    },
    setIriNames(iris: TTIriRef[], ttIris: TTIriRef[]) {
      for (const i of iris) {
        const match = ttIris.find(t => t["@id"] === i["@id"]);
        if (match) {
          i["name"] = match.name;
        }
      }
    },
    async getInferred(iri: string): Promise<void> {
      const result = await this.$entityService.getDefinitionBundle(iri);
      if (isObjectHasKeys(result, ["entity"]) && isObjectHasKeys(result.entity, [RDFS.SUBCLASS_OF, IM.ROLE_GROUP])) {
        const roleGroup = result.entity[IM.ROLE_GROUP];
        delete result.entity[IM.ROLE_GROUP];
        const newRoleGroup: any = {};
        newRoleGroup[IM.ROLE_GROUP] = roleGroup;
        result.entity[RDFS.SUBCLASS_OF].push(newRoleGroup);
      }
      this.concept["inferred"] = result;
    },

    async getConfig(): Promise<void> {
      const definitionConfig = await this.$configService.getComponentLayout("definition");
      const summaryConfig = await this.$configService.getComponentLayout("summary");
      this.configs = definitionConfig.concat(summaryConfig);

      if (this.configs.every(config => isObjectHasKeys(config, ["order"]))) {
        this.configs.sort(byOrder);
      } else {
        this.$loggerService.error(undefined, "Failed to sort config for definition component layout. One or more config items are missing 'order' property.");
      }
    },

    async init(): Promise<void> {
      this.loading = true;
      await this.getConfig();
      await this.getConcept(this.selectedConceptIri);
      await this.getInferred(this.selectedConceptIri);
      await this.getTerms(this.selectedConceptIri);
      this.types = isObjectHasKeys(this.concept, [RDF.TYPE]) ? this.concept[RDF.TYPE] : ([] as TTIriRef[]);
      this.header = this.concept[RDFS.LABEL];
      this.loading = false;
    },

    async getTerms(iri: string) {
      const entity = await this.$entityService.getPartialEntity(iri, [IM.HAS_TERM_CODE]);
      this.terms = isObjectHasKeys(entity, [IM.HAS_TERM_CODE])
        ? (entity[IM.HAS_TERM_CODE] as []).map(term => {
            return { name: term[RDFS.LABEL], code: term[IM.CODE] };
          })
        : undefined;
    },

    setContentHeight(): void {
      const calcHeight = getContainerElementOptimalHeight("concept-main-container", ["p-panel-header", "p-tabview-nav-container"], true, 4, 1);
      if (!calcHeight.length) {
        this.contentHeight = "height: 700px; max-height: 700px;";
        this.contentHeightValue = 800;
      } else {
        this.contentHeight = "height: " + calcHeight + ";" + "max-height: " + calcHeight + ";";
        this.contentHeightValue = parseInt(calcHeight, 10);
      }
    }
  }
});
</script>
<style scoped>
#concept-main-container {
  height: 100%;
  width: 100%;
}

.p-tabview-panel {
  min-height: 100%;
}

.p-panel {
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  height: 100%;
}

.concept-panel-content {
  height: 100%;
  overflow: auto;
  background-color: #ffffff;
}

.copy-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.icons-container {
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
}

.loading-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
}
</style>
