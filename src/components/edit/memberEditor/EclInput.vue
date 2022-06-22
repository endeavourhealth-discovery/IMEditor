<template>
  <div class="ecl-container">
    <Textarea v-model="ecl" class="eclInput" placeholder="Enter ecl..." :class="eclError ? 'p-invalid' : ''" />
    <div class="button-container">
      <Button class="button-search p-button-success" label="Search" @click="submitEcl" />
    </div>

    <EclResults :loading="loading" :results="eclAsNode" />
    <div class="button-container">
      <Button class="button-submit" label="Update" @click="onSubmit" />
    </div>
  </div>
</template>

<script lang="ts">
import { TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import { defineComponent } from "@vue/runtime-core";
import axios from "axios";
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import EclResults from "@/components/edit/memberEditor/EclResults.vue";
import { Helpers, Vocabulary } from "im-library";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys, isObject }
} = Helpers;
const { IM, SHACL, RDF } = Vocabulary;

export default defineComponent({
  name: "EclInput",
  components: { EclResults },
  emits: { "concept-updated": (payload: any) => isObjectHasKeys(payload) },
  watch: {
    ecl() {
      this.eclError = false;
    }
  },
  data() {
    return {
      ecl: "",
      controller: {} as AbortController,
      eclAsNode: [] as any[],
      eclAsIriRefs: [] as TTIriRef[],
      eclError: false,
      loading: false
    };
  },
  methods: {
    async submitEcl() {
      this.loading = true;
      if (!isObject(this.controller)) {
        this.controller.abort();
      }
      this.controller = new AbortController();
      this.eclAsNode = await this.$setService.evaluateEcl(this.ecl, this.controller);
      if (isArrayHasLength(this.eclAsNode)) {
        this.eclAsIriRefs = this.eclAsNode.map(item => {
          return { "@id": item.iri, name: item.name };
        });
      } else {
        this.eclError = true;
      }
      this.loading = false;
    },

    onSubmit() {
      const def: any = {};
      def[IM.DEFINITION] = this.eclAsIriRefs;
      this.$emit("concept-updated", def);
    }
  }
});
</script>

<style scoped>
.ecl-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  gap: 0.5rem;
}

.eclInput {
  width: 100%;
  height: 10rem;
}

.button-container {
  display: flex;
  flex-flow: column;
  justify-content: flex-start;
  align-items: flex-end;
}

.button-submit,
.button-search {
  width: fit-content;
}
</style>
