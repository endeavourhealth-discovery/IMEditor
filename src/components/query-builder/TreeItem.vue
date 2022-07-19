<template>
  <li>
    <div v-if="model.type === 'selectOptions'">
      <Dropdown v-model="model.value" :options="selectOptions" optionLabel="name" placeholder="Add" @input="addChild" />
    </div>
    <div v-else :class="{ bold: isFolder }" @click="toggle" @dblclick="changeType">
      {{ model.name }}
      <span v-if="isFolder">[{{ isOpen ? "-" : "+" }}]</span>
    </div>
    <ul v-show="isOpen" v-if="isFolder">
      <!--
        A component can recursively render itself using its
        "name" option (inferred from filename if using SFC)
      -->
      <TreeItem class="item" v-for="model in model.children" v-bind:key="model" :model="model"> </TreeItem>
      <li class="add" @click="addChild">+</li>
    </ul>
  </li>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

export default defineComponent({
  name: "TreeItem", // necessary for self-reference
  props: {
    model: { type: Object, required: true }
  },
  data() {
    return {
      isOpen: false,
      selectOptions: [
        { name: "property", value: "" },
        { name: "match", value: "" },
        { name: "logic", value: "" }
      ]
    };
  },
  computed: {
    isFolder(): boolean {
      return this.model.children && this.model.children.length;
    }
  },
  methods: {
    toggle() {
      if (this.isFolder) {
        this.isOpen = !this.isOpen;
      }
    },
    changeType() {
      if (!this.isFolder) {
        this.model.children = [];
        this.addChild();
        this.isOpen = true;
      }
    },
    addChild() {
      this.model.children.push({
        type: "selectOptions"
      });
    }
  }
});
</script>
