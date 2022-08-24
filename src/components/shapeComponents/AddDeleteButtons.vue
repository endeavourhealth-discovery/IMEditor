<template>
  <div class="switch-button-container">
    <div class="buttons-container">
      <Button v-if="show.minus" icon="fa-solid fa-minus" class="p-button-rounded p-button-outlined p-button-danger" @click="deleteClicked" />
      <Button v-if="show.plus" icon="fa-solid fa-plus" class="p-button-rounded p-button-outlined p-button-success" @click="addNextClicked" />
    </div>
    <Menu ref="optionsMenu" :model="menuOptions" :popup="true" />
  </div>
</template>

<script setup lang="ts">
import { defineComponent, onMounted, PropType, ref, Ref, watch } from "vue";
import { ComponentType } from "im-library/dist/types/enums/Enums";
import _ from "lodash";

const props = defineProps({
  position: Number,
  show: { type: Object as PropType<{ minus: boolean; plus: boolean }>, default: { minus: true, plus: true } },
  options: { type: Array as PropType<Array<ComponentType>>, required: true }
});

const emit = defineEmits({
  addNextClicked: (_payload: any) => true,
  deleteClicked: () => true
});

let menuOptions: Ref<any[]> = ref([]);
let selected: Ref<ComponentType | undefined> = ref();

const optionsMenu = ref();

watch(
  () => _.cloneDeep(selected.value),
  newValue => {
    if (newValue) emit("addNextClicked", newValue);
  }
);

onMounted(() => {
  setMenuOptions();
});

function addNextClicked(event: any) {
  (optionsMenu.value as any).toggle(event);
}

function deleteClicked() {
  emit("deleteClicked");
}

function setMenuOptions() {
  for (const item of props.options) {
    menuOptions.value.push({
      label: item,
      command: (option: any) => {
        selected.value = undefined;
        selected.value = option.item.label;
      }
    });
  }
}
</script>

<style scoped>
.switch-button-container {
  order: 2;
  display: flex;
  flex-flow: column nowrap;
  justify-content: center;
  align-items: center;
}

.buttons-container {
  display: flex;
  flex-flow: row;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
