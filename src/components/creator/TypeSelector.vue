<template>
  <div class="type-buttons-container">
    <Button v-for="type of typeOptions" :key="type['@id']" class="custom-button" @click="typeSelected(type)">
      <span>{{ type.name }}</span>
    </Button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@vue/runtime-core";
import { mapState } from "vuex";
import { Vocabulary } from "im-library";
import { EntityReferenceNode } from "im-library/dist/types/interfaces/Interfaces";
const { IM, RDF } = Vocabulary;

export default defineComponent({
  name: "TypeSelector",
  props: { updatedConcept: { type: Object as any, required: true }, mode: { type: String, required: true } },
  emits: { "concept-updated": (payload: any) => true },
  computed: { ...mapState(["filterOptions"]) },
  mounted() {
    this.setOptions();
  },
  data() {
    return {
      typeOptions: [] as any[]
    };
  },
  methods: {
    setOptions() {
      this.typeOptions = this.filterOptions.types.filter((type: EntityReferenceNode) => type["@id"] === IM.CONCEPT || type["@id"] === IM.CONCEPT_SET);
    },

    typeSelected(data: any) {
      const selected = {} as any;
      selected[RDF.TYPE] = [{ "@id": data["@id"] }];
      this.$emit("concept-updated", selected);
    }
  }
});
</script>

<style scoped>
.type-buttons-container {
  width: 100%;
  flex: 1 1 auto;
  overflow: auto;
  display: flex;
  flex-flow: row wrap;
  justify-content: center;
  align-items: center;
  gap: 1rem;
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
