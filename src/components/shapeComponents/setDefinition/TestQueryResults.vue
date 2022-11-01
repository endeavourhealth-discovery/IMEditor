<template>
  <Dialog
    :header="queryLoading ? 'Results' : 'Results: ' + testQueryResults.length"
    v-model:visible="showDialog"
    :breakpoints="{ '960px': '75vw', '640px': '90vw' }"
    :style="{ width: '50vw' }"
    :closable="false"
  >
    <div v-if="queryLoading" class="flex flex-row justify-contents-center align-items-center">
      <ProgressSpinner />
    </div>
    <div v-else-if="!queryLoading && isArrayHasLength(testQueryResults)">
      <div v-for="iriRef of testQueryResults">
        <IMViewerLink :iri="iriRef['@id']" :label="iriRef.name" />
      </div>
    </div>
    <div v-else>No concepts found</div>
    <template #footer>
      <Button label="OK" icon="pi pi-check" @click="close" autofocus />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { QueryRequest, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { onMounted, PropType, ref, Ref } from "vue";
import { Services, Helpers } from "im-library";
import axios from "axios";
const { isArrayHasLength } = Helpers.DataTypeCheckers;
const { EntityService, QueryService, LoggerService } = Services;
const entityService = new EntityService(axios);
const queryService = new QueryService(axios);
const queryLoading: Ref<boolean> = ref(false);

const testQueryResults: Ref<TTIriRef[]> = ref([]);

const props = defineProps({
  imquery: { type: Object as PropType<QueryRequest>, required: false },
  showDialog: { type: Boolean, required: true }
});

const emit = defineEmits({ closeDialog: () => true });

onMounted(async () => {
  if (props.imquery) await testQuery();
});

function close() {
  emit("closeDialog");
}

async function testQuery() {
  queryLoading.value = true;
  const result = await queryService.queryIM({ query: props.imquery } as unknown as QueryRequest);
  if (isArrayHasLength(result.entities)) {
    testQueryResults.value = await entityService.getNames(result.entities.map(entity => entity["@id"]));
  }
  queryLoading.value = false;
}
</script>

<style scoped></style>
