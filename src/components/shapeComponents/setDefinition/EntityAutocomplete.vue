<template>
  <AutoComplete :multiple="true" v-model="selectedEntity" :suggestions="suggestions" @complete="searchEntity($event)" @item-select="handleChange">
    <template #item="slotProps"> {{ slotProps.item.name }} - {{ slotProps.item["@id"] }} </template>
    <template #chip="slotProps">
      <div v-tooltip.right="slotProps.value['@id']">{{ slotProps.value.name }}</div>
    </template>
  </AutoComplete>
</template>

<script setup lang="ts">
import { QueryObject, SearchRequest, SetQueryObject, TTAlias, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { onMounted, PropType, ref, watch } from "vue";
import { Services, Enums, Helpers, Config } from "im-library";
import axios from "axios";
import _ from "lodash";
const { EntityService } = Services;
const { isObject, isObjectHasKeys, isArrayHasLength } = Helpers.DataTypeCheckers;

const props = defineProps({
  ttAlias: { type: Object as PropType<TTAlias>, required: true },
  parentClauseIri: { type: String, required: false },
  getSuggestionsMethod: { type: Function, required: false }
});

const suggestions = ref();
const entityService = new EntityService(axios);
const abortController = ref(new AbortController());
const selectedEntity = ref();

function handleChange(event: any) {
  selectedEntity.value = [event.value];
  props.ttAlias["@id"] = event.value["@id"];
  props.ttAlias.name = event.value.name;
}

async function searchEntity(searchTerm: any): Promise<void> {
  if (searchTerm.query.length > 0) {
    if (props.getSuggestionsMethod) {
      const filtereredSuggestions = await props.getSuggestionsMethod(props.parentClauseIri, searchTerm.query);
      suggestions.value = filtereredSuggestions;
    } else {
      const searchRequest = {} as SearchRequest;
      searchRequest.termFilter = searchTerm.query;
      searchRequest.sortBy = Enums.SortBy.Usage;
      searchRequest.page = 1;
      searchRequest.size = 100;
      searchRequest.sortDirection = Enums.SortDirection.DESC;
      searchRequest.sortField = "weighting";
      searchRequest.schemeFilter = Config.FilterDefaults.schemeOptions;
      searchRequest.typeFilter = Config.FilterDefaults.typeOptions;
      searchRequest.statusFilter = Config.FilterDefaults.statusOptions;
      if (!isObject(abortController.value)) {
        abortController.value.abort();
      }

      abortController.value = new AbortController();
      const results = await entityService.advancedSearch(searchRequest, abortController.value);
      suggestions.value = results.map(result => {
        return { name: result.name, "@id": result.iri };
      });
    }
  }
}
</script>

<style scoped></style>
