<template>
  <li>
    <div v-if="model.type === 'text'">
      <InputText v-model="model.name" @keydown="onEnterKeyDown" />
      <span v-if="parent" @click="removeChild(parent)">[x]</span>
    </div>
    <div v-else-if="model.type === 'dropdown'">
      <Dropdown v-model="model.name" :options="getOptions()" placeholder="Add" @change="onSelect" />
      <span v-if="parent" @click="removeChild(parent)">[x]</span>
    </div>
    <div v-else :class="{ bold: isFolder }" @click="toggle" @dblclick="changeType">
      {{ model.name }}
      <span v-if="parent" @click="removeChild(parent)">[x]</span>
      <!-- <span v-if="isFolder">[{{ isOpen ? "-" : "+" }}]</span> -->
    </div>
    <ul v-show="isOpen" v-if="isFolder">
      <!--
        A component can recursively render itself using its
        "name" option (inferred from filename if using SFC)
      -->
      <TreeItem class="item" v-for="child in model.children" v-bind:key="child" :model="child" :parent="model"> </TreeItem>
      <li class="add" @click="addChild">+</li>
    </ul>
  </li>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import TreeItem from "./TreeItem";

export default defineComponent({
  name: "TreeItem", // necessary for self-reference
  props: {
    model: { type: Object as PropType<TreeItem>, required: true },
    parent: { type: Object as PropType<TreeItem>, required: false }
  },
  data() {
    return {
      isOpen: false,
      selectOptions: ["property", "match", "logic"],
      propertyOptions: ["id", "label"],
      matchOptions: ["property", "entityType"],
      entityTypeOptions: ["datamodel", "concept"]
    };
  },
  computed: {
    isFolder(): boolean {
      return this.model.children && this.model.children.length;
    }
  },
  methods: {
    getOptions() {
      switch (this.model.name) {
        case "property":
          return this.propertyOptions;
        case "match":
          return this.matchOptions;
        case "entityType":
          return this.entityTypeOptions;
        case "select":
          return this.selectOptions;

        default:
          return this.selectOptions;
      }
    },
    removeChild(parent: TreeItem) {
      parent.children = parent.children?.filter((child: TreeItem) => {
        return child.name !== this.model.name;
      });
    },

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

    onEnterKeyDown(event: any) {
      if (event.key === "Enter") this.onSelect();
    },

    onSelect() {
      this.model.type = this.model.name;
    },

    addChild() {
      const item = {} as TreeItem;
      switch (this.model.type) {
        case "property":
        case "entityType":
        case "match":
        case "select":
          item.type = "dropdown";
          break;

        default:
          item.type = "text";
          break;
      }
      item.name = this.model.name;
      this.model.children.push(item);
    }
  }
});
</script>
