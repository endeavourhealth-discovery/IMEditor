<template>
  <div v-for="(included, clauseIndex) of clauses" class="clause-wrapper">
    <div class="clause-container">
      <Button icon="pi pi-times" class="p-button-rounded p-button-danger p-button-text" @click="removeClause(clauseIndex)" />
      <Dropdown v-model="included.include" :options="includeOptions" option-label="name" option-value="value" placeholder="Include or exclude" />
      <EntityAutocomplete :ttAlias="included.concept" />
      <Dropdown
        v-model="included.concept.includeSubtypes"
        :options="includeSubtypesOptions"
        option-label="name"
        option-value="value"
        placeholder="Include subtypes"
      />
      <Button icon="pi pi-cog" v-tooltip="'Add refinement'" class="p-button-warning one-rem-margin" @click="addRefinement(clauseIndex)" />
      <Button
        v-if="clauseIndex === clauses.length - 1"
        icon="pi pi-plus"
        v-tooltip="'Add concept'"
        class="p-button-success one-rem-margin"
        @click="addConcept"
      />
    </div>
    <div v-for="(refinement, refinementIndex) of included.refinements" class="refinement-wrapper">
      <div class="refinement-container">
        <div class="clause-container">
          <Button icon="pi pi-times" class="p-button-rounded p-button-danger p-button-text" @click="removeRefinement(clauseIndex, refinementIndex)" />
          <EntityAutocomplete
            :ttAlias="refinement.property"
            :parentClauseIri="included.concept['@id']"
            :get-suggestions-method="getAllowablePropertySuggestions"
          />
          <Dropdown
            v-model="refinement.property.includeSubtypes"
            :options="includeSubtypesOptions"
            option-label="name"
            option-value="value"
            placeholder="Include subtypes"
          />
          <i class="icon pi pi-arrow-right" />
          <EntityAutocomplete :ttAlias="refinement.is" :parentClauseIri="refinement.property['@id']" :get-suggestions-method="getAllowableRangeSuggestions" />
          <Dropdown
            v-model="refinement.is.includeSubtypes"
            :options="includeSubtypesOptions"
            option-label="name"
            option-value="value"
            placeholder="Include subtypes"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SetQueryObject, TTAlias, Refinement } from "im-library/dist/types/interfaces/Interfaces";
import { PropType } from "vue";
import EntityAutocomplete from "./setDefinition/EntityAutocomplete.vue";
import { Services } from "im-library";
import axios from "axios";
const queryService = new Services.QueryService(axios);
const defaultTTAlias = { includeSubtypes: true } as TTAlias;
const includeOptions = [
  { name: "include", value: true },
  { name: "exclude", value: false }
];
const includeSubtypesOptions = [
  { name: "include subtypes", value: true },
  { name: "exclude subtypes", value: false }
];

const props = defineProps({ clauses: { type: Array as PropType<SetQueryObject[]>, required: true } });

function addRefinement(index: number) {
  const refinement = { property: { ...defaultTTAlias }, is: { ...defaultTTAlias } } as Refinement;
  props.clauses[index].refinements.push(refinement);
}
function removeClause(index: number) {
  if (props.clauses.length !== 1) props.clauses.splice(index, 1);
}
function removeRefinement(clauseIndex: number, refinementIndex: number) {
  props.clauses[clauseIndex].refinements.splice(refinementIndex, 1);
}
function addConcept() {
  const newObject = {
    include: true,
    concept: { ...defaultTTAlias },
    refinements: [] as Refinement[]
  } as SetQueryObject;
  props.clauses.push(newObject);
}

async function getAllowablePropertySuggestions(iri: string, searchTerm: string) {
  return await queryService.getAllowablePropertySuggestions(iri, searchTerm);
}

async function getAllowableRangeSuggestions(iri: string, searchTerm: string) {
  return await queryService.getAllowableRangeSuggestions(iri, searchTerm);
}
</script>

<style scoped>
.clause-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
}
.refinement-container {
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
}
.icon {
  align-self: center;
  padding-left: 1rem;
  padding-right: 1rem;
}

.clause-wrapper {
  padding-bottom: 2rem;
}
</style>
