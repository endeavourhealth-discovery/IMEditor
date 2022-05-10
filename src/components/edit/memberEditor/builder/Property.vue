<template>
  <p>property</p>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/runtime-core";
import { Enums } from "im-library";
import { ComponentDetails, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";

export default defineComponent({
  name: "Property",
  props: {
    id: { type: String, required: true },
    position: { type: Number, required: true },
    value: { type: Object as PropType<{ propertyIri: string; associatedmember: TTIriRef }>, required: true },
    showButtons: { type: Object as PropType<{ minus: boolean; plus: boolean }>, required: true },
    builderType: { type: String as PropType<Enums.BuilderType>, required: true }
  },
  emits: {
    updateClicked: (_payload: ComponentDetails) => true,
    addNextOptionsClicked: (_payload: any) => true,
    deleteClicked: (_payload: ComponentDetails) => true,
    addClicked: (_payload: any) => true
  },
  watch: {
    value: {
      async handler() {
        // await this.init();
      }
    }
  },
  async mounted() {
    // await this.init();
  },
  data() {
    return {
      loading: true,
      options: [] as any[],
      selected: {} as TTIriRef
    };
  },
  methods: {
    // async init() {
    //   const typeOptions = [{ "@id": RDF.PROPERTY }];
    //   const options = { status: this.filterOptions.status, schemes: this.filterOptions.schemes, types: typeOptions };
    //   const result = await EntityService.getPartialEntity(this.value.propertyIri, [RDFS.LABEL]);
    //   const propertyName = result ? result[RDFS.LABEL] : "";
    //   const query = this.createPropertyOptionsQuery(this.value.propertyIri);
    //   const queryResult = await QueryService.queryIM(query);
    // }
  }
});
</script>

<style scoped></style>
