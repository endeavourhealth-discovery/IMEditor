<template>
  <div class="type-selector">
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
    </div>
    <div v-else class="header-content-container">
      <span class="text">Select entity type:</span>
      <div class="type-buttons-container">
        <button v-for="typee in typeOptions" class="custom-button" @click="typeSelected(typee)">
          <span>{{ typee.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, Ref, onMounted, inject } from "vue";
import { useStore } from "vuex";
import { Config, Vocabulary, Services } from "im-library";
import { EntityReferenceNode, TTIriRef, ConceptSummary } from "im-library/dist/types/interfaces/Interfaces";
import injectionKeys from "@/injectionKeys/injectionKeys";
import axios from "axios";
const { IM, RDF } = Vocabulary;
const { EntityService } = Services;

const entityUpdate = inject(injectionKeys.editorEntity)?.updateEntity;

const entityService = new EntityService(axios);

let loading = ref(false);
let typeOptions: Ref<EntityReferenceNode[]> = ref([]);

onMounted(async () => {
  await setOptions();
});

async function setOptions() {
  loading.value = true;
  typeOptions.value = await entityService.getEntityChildren("http://endhealth.info/im#EntityTypes");
  loading.value = false;
  // typeOptions.value = filterOptions.value.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT || type["@id"] === IM.CONCEPT_SET);
}

function typeSelected(data: EntityReferenceNode) {
  const result = {} as any;
  result[RDF.TYPE] = [{ "@id": data["@id"], name: data.name }];
  if (entityUpdate) entityUpdate(result);
}
</script>

<style scoped>
.type-selector {
  width: 100%;
  height: 100%;
}

.header-content-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
}

.loading-container {
  display: flex;
  flex-flow: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}
.type-buttons-container {
  width: 80%;
  flex: 0 1 auto;
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.text {
  font-size: large;
  padding: 0 0 1rem 0;
}

.custom-button {
  width: 130px;
  height: 40px;
  font-family: "Lato", sans-serif;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  display: inline-block;
  background: #bb3f3f;
  color: #fff;
  line-height: 42px;
  padding: 0;
  border: none;
}

.custom-button span {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
}
.custom-button:before,
.custom-button:after {
  position: absolute;
  content: "";
  height: 0%;
  width: 2px;
  background: #bb3f3f;
}
.custom-button:before {
  right: 0;
  top: 0;
  transition: all 500ms ease;
}
.custom-button:after {
  left: 0;
  bottom: 0;
  transition: all 500ms ease;
}
.custom-button:hover {
  color: #bb3f3f;
  background: transparent;
}
.custom-button:hover:before {
  transition: all 500ms ease;
  height: 100%;
}
.custom-button:hover:after {
  transition: all 500ms ease;
  height: 100%;
}
.custom-button span:before,
.custom-button span:after {
  position: absolute;
  content: "";
  background: #bb3f3f;
}
.custom-button span:before {
  left: 0;
  top: 0;
  width: 0%;
  height: 2px;
  transition: all 500ms ease;
}
.custom-button span:after {
  right: 0;
  bottom: 0;
  width: 0%;
  height: 2px;
  transition: all 500ms ease;
}
.custom-button span:hover:before {
  width: 100%;
}
.custom-button span:hover:after {
  width: 100%;
}
</style>
