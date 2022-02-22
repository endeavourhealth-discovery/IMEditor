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
import { TTIriRef } from "@/models/TripleTree";
import SetService from "@/services/SetService";
import { defineComponent } from "@vue/runtime-core";
import axios from "axios";
import EclResults from "@/components/edit/memberEditor/EclResults.vue";
import { Helpers } from "im-library";
const {
  DataTypeCheckers: { isArrayHasLength, isObjectHasKeys }
} = Helpers;

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
      request: {} as { cancel: any; msg: string },
      eclAsNode: [] as any[],
      eclAsIriRefs: [] as TTIriRef[],
      eclError: false,
      loading: false
    };
  },
  methods: {
    async submitEcl() {
      this.loading = true;
      if (isObjectHasKeys(this.request, ["cancel", "msg"])) {
        await this.request.cancel({ status: 499, message: "Process cancelled by user" });
      }
      const axiosSource = axios.CancelToken.source();
      this.request = { cancel: axiosSource.cancel, msg: "Loading..." };
      this.eclAsNode = await SetService.evaluateEcl(this.ecl, axiosSource.token);
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
      this.$emit("concept-updated", { "http://endhealth.info/im#definition": this.eclAsIriRefs });
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
