<template>
  <div class="quantifier-item-container" :id="id">
    <div class="label-container">
      <span class="float-text">Quantifier</span>
      <div v-if="loading" class="loading-container">
        <ProgressSpinner style="width:1.5rem;height:1.5rem;" strokeWidth="6" />
      </div>
      <Dropdown
        v-else
        v-model="selectedResult"
        :options="dropdownOptions"
        optionLabel="name"
        placeholder="select a quantifier"
        :disabled="invalidAssociatedProperty"
      />
      <small v-if="invalidAssociatedProperty" class="validate-error">Missing property for refinement. Please select a property first.</small>
    </div>
    <AddDeleteButtons :show="showButtons" :position="position" :options="[]" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import SearchMiniOverlay from "@/components/edit/memberEditor/builder/entity/SearchMiniOverlay.vue";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { mapState } from "vuex";
import { Vocabulary, Helpers, Enums, Models } from "im-library";
import { TTIriRef, ComponentDetails } from "im-library/dist/types/interfaces/Interfaces";
import QueryService from "@/services/QueryService";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  TypeGuards: { isTTIriRef },
  Sorters: { byName }
} = Helpers;
const { IM, RDFS } = Vocabulary;
const { ComponentType } = Enums;

export default defineComponent({
  name: "Quantifier",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; quantifier: TTIriRef }>, required: true },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (_payload: ComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: ComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  components: { AddDeleteButtons, SearchMiniOverlay },
  computed: mapState(["filterOptions", "selectedFilters"]),
  watch: {
    value: {
      async handler() {
        await this.init();
      },
      deep: true
    }
  },
  async mounted() {
    await this.init();
  },
  data() {
    return {
      loading: false,
      selectedResult: {} as TTIriRef,
      dropdownOptions: [] as any[],
      invalidAssociatedProperty: false
    };
  },
  methods: {
    async init() {
      this.loading = true;
      if (this.value && isTTIriRef(this.value.quantifier)) {
        this.selectedResult = this.value.quantifier;
      }
      if (this.value.propertyIri) {
        this.invalidAssociatedProperty = false;
        const query = this.createQuantifierOptionsQuery(this.value.propertyIri);
        const queryResult = await QueryService.queryIM(query);
        console.log(queryResult);
        if (isObjectHasKeys(queryResult, ["entities", "@context"]) && isArrayHasLength(queryResult.entities)) {
          this.dropdownOptions = queryResult.entities
            .map(result => {
              return { "@id": result["@id"][0], name: result[RDFS.LABEL][0] };
            })
            .sort(byName);
        }
      } else {
        this.invalidAssociatedProperty = true;
      }
      this.loading = false;
    },

    createQuantifierOptionsQuery(iri: string) {
      return {
        name: "Ranges for finding site",
        description: "retrieves the high level concepts allowable as values of the attribute finding side",
        activeOnly: true,
        select: {
          distinct: true,
          filter: {
            property: {
              "@id": "http://www.w3.org/2000/01/rdf-schema#range"
            },
            inverseOf: true,
            valueConcept: [
              {
                includeSupertypes: true,
                "@id": iri
              }
            ]
          },
          property: [
            {
              "@id": "http://endhealth.info/im#id"
            },
            {
              "@id": "http://www.w3.org/2000/01/rdf-schema#label"
            }
          ]
        }
      };
    },

    createQuantifier(): ComponentDetails {
      return {
        value: this.selectedResult,
        id: this.id,
        position: this.position,
        type: ComponentType.QUANTIFIER,
        json: this.selectedResult,
        builderType: this.builderType,
        showButtons: this.showButtons
      };
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.selectedResult,
        position: this.position,
        type: ComponentType.QUANTIFIER,
        builderType: this.builderType,
        json: this.selectedResult,
        showButtons: this.showButtons
      });
    },

    addNextClicked(): void {
      this.$emit("addNextOptionsClicked", {
        selectedType: ComponentType.QUANTIFIER,
        position: this.position + 1
      });
    }
  }
});
</script>

<style scoped>
.quantifier-item-container {
  flex: 1 1 auto;
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
  gap: 1rem;
  width: 100%;
}

.loading-container {
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.label-container {
  flex: 1 1 auto;
  padding: 1rem;
  border: 1px solid #ffc952;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
}

.label {
  cursor: pointer;
  border: 1px solid #dee2e6;
  border-radius: 3px;
  background-color: #ffffff;
  padding: 0.25rem;
}

.float-text {
  position: absolute;
  left: 0;
  top: 0;
  font-size: 0.75rem;
  color: #6c757d;
}

.p-dropdown {
  width: 100%;
}

.validate-error {
  color: #e24c4c;
  font-size: 0.8rem;
  padding: 0 0 0.25rem 0;
}
</style>
