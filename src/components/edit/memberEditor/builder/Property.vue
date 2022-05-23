<template>
  <div class="property-container">
    <div class="label-content-container">
      <span class="float-text">Property</span>
      <div v-if="loading" class="loading-container">
        <ProgressSpinner style="width:1.5rem;height:1.5rem;" strokeWidth="6" />
      </div>
      <Dropdown v-else v-model="selected" :options="dropdownOptions" optionLabel="name" placeholder="select a property" :disabled="invalidAssociatedMember" />
      <small v-if="invalidAssociatedMember" class="validate-error">Missing member for refinement. Please select a member first.</small>
    </div>
    <AddDeleteButtons :show="showButtons" :position="position" :options="[]" @deleteClicked="deleteClicked" @addNextClicked="addNextClicked" />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import AddDeleteButtons from "@/components/edit/memberEditor/builder/AddDeleteButtons.vue";
import { Enums, Helpers, Vocabulary } from "im-library";
import { ComponentDetails, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import EntityService from "@/services/EntityService";
import QueryService from "@/services/QueryService";
const { RDFS } = Vocabulary;
const { ComponentType } = Enums;
const {
  TypeGuards: { isTTIriRef },
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys },
  Sorters: { byName }
} = Helpers;

export default defineComponent({
  name: "Property",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; associatedMember: TTIriRef }>, required: true },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, required: true },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  components: { AddDeleteButtons },
  emits: {
    updateClicked: (_payload: ComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: ComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  watch: {
    value: {
      async handler() {
        await this.init();
      },
      deep: true
    },
    selected: {
      handler(newValue, oldValue) {
        if (newValue && JSON.stringify(newValue) !== JSON.stringify(oldValue) && newValue["@id"]) this.onConfirm();
      },
      deep: true
    }
  },
  async mounted() {
    await this.init();
  },
  data() {
    return {
      loading: true,
      dropdownOptions: [] as any[],
      selected: {} as TTIriRef,
      invalidAssociatedMember: false
    };
  },
  methods: {
    async init() {
      this.loading = true;
      if (this.value.propertyIri) {
        const result = await EntityService.getPartialEntity(this.value.propertyIri, [RDFS.LABEL]);
        const propertyName = result ? result[RDFS.LABEL] : "";
        this.selected = { "@id": this.value.propertyIri, name: propertyName };
      }
      if (isTTIriRef(this.value.associatedMember)) {
        this.invalidAssociatedMember = false;
        const query = this.createPropertyOptionsQuery(this.value.associatedMember["@id"]);
        const queryResult = await QueryService.queryIM(query);
        if (isObjectHasKeys(queryResult, ["entities", "@context"]) && isArrayHasLength(queryResult.entities)) {
          this.dropdownOptions = queryResult.entities
            .map(result => {
              return { "@id": result["@id"], name: result[RDFS.LABEL][0] };
            })
            .sort(byName);
        }
      } else {
        this.invalidAssociatedMember = true;
      }
      this.loading = false;
    },

    createPropertyOptionsQuery(iri: string) {
      return {
        name: "AllowablePropertiesForCovid",
        description: "gets the active properties and their subtypes that have a domain which is a super type of covid.",
        activeOnly: true,
        select: {
          distinct: true,
          entityType: {
            includeSubtypes: true,
            "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#Property"
          },
          filter: {
            property: {
              "@id": "http://www.w3.org/2000/01/rdf-schema#domain"
            },
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

    onConfirm() {
      this.$emit("updateClicked", {
        id: this.id,
        value: this.createAsJson(),
        position: this.position,
        type: ComponentType.PROPERTY,
        builderType: this.builderType,
        json: this.selected,
        showButtons: this.showButtons
      });
    },

    createAsJson() {
      return { propertyIri: this.selected["@id"], associatedMember: this.value.associatedMember };
    },

    deleteClicked(): void {
      this.$emit("deleteClicked", {
        id: this.id,
        value: this.createAsJson(),
        position: this.position,
        type: ComponentType.PROPERTY,
        builderType: this.builderType,
        json: this.selected,
        showButtons: this.showButtons
      });
    },

    addNextClicked(): void {
      this.$emit("addNextOptionsClicked", {
        selectedType: ComponentType.PROPERTY,
        position: this.position + 1
      });
    }
  }
});
</script>

<style scoped>
.property-container {
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

.label-content-container {
  flex: 1 1 auto;
  padding: 1rem;
  border: 1px solid #ffc952;
  border-radius: 3px;
  position: relative;
  min-width: 15rem;
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
