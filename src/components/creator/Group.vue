<template>
  <div>
    <p>Hi group!</p>
  </div>
</template>

<script setup lang="ts">
import { PropertyGroup } from "im-library/dist/types/interfaces/Interfaces";
import { ref, Ref, computed, watch, inject, onMounted, defineProps, defineEmits, PropType } from "vue";
import { Enums } from "im-library";
const { EditorMode } = Enums;

const props = defineProps({
  data: { type: Object as PropType<PropertyGroup>, required: true },
  updatedConcept: { type: Object as PropType<any>, required: true },
  mode: { type: Object as PropType<Enums.EditorMode>, required: true }
});
</script>

<style scoped></style>
