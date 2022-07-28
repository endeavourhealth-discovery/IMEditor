<template>
  <ul>
    <div v-if="model.type === 'text'">
      <InputText v-model="model.value" @keydown="onEnterKeyDown" />
      <span v-if="parent" @click="removeChild()"><i class="pi pi-times-circle"></i></span>
    </div>
    <div v-else-if="model.type === 'dropdown'">
      <Dropdown
        v-model="model.value"
        :options="getOptions()"
        optionLabel="name"
        :editable="true"
        :filter="true"
        placeholder="Select"
        @keydown="onEnterKeyDown"
        @change="onSelect"
      />
      <span v-if="parent" @click="removeChild()"><i class="pi pi-times-circle"></i></span>
    </div>
    <div v-else @click="toggle" @dblclick="changeType">
      <i v-if="isFolder" :class="isOpen ? 'pi pi-folder-open' : 'pi pi-folder'"></i>
      {{ model.name }}
      <span v-if="parent" @click="removeChild()"><i class="pi pi-times-circle"></i> </span>
    </div>
    <ul v-show="isOpen" v-if="isFolder">
      <TreeItem class="item" v-for="child in model.children" v-bind:key="child.key" :model="child" :parent="model" @updateQuery="emitUpdateQuery"> </TreeItem>
      <ul class="add" @click="addChild">
        <i class="pi pi-plus-circle"></i>
      </ul>
    </ul>
  </ul>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import TreeItem from "./TreeItem";
import { Helpers, Services, Interfaces } from "im-library";
import axios from "axios";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;

export default defineComponent({
  name: "TreeItem", // necessary for self-reference
  props: {
    model: { type: Object as PropType<TreeItem>, required: true },
    parent: { type: Object as PropType<TreeItem>, required: false }
  },
  emits: ["updateQuery"],
  data() {
    return {
      isOpen: false,
      clauseOptions: [{ name: "select" }, { name: "property" }, { name: "match" }, { name: "logic" }] as Interfaces.TTIriRef[],
      propertyOptions: [] as Interfaces.TTIriRef[],
      matchOptions: [{ name: "property" }, { name: "entityType" }, { name: "entityId" }],
      entityTypeOptions: [] as Interfaces.TTIriRef[]
    };
  },
  computed: {
    isFolder(): boolean {
      return isArrayHasLength(this.model.children);
    }
  },
  async mounted() {
    await this.getClasses();
    await this.getProperties();
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
          return this.clauseOptions;

        default:
          return this.clauseOptions;
      }
    },
    removeChild() {
      if (this.parent && isObjectHasKeys(this.parent) && isArrayHasLength(this.parent.children))
        this.parent.children = this.parent.children?.filter((child: TreeItem) => {
          return child.key !== this.model.key;
        });
      this.emitUpdateQuery();
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

    emitUpdateQuery() {
      this.$emit("updateQuery");
    },

    onEnterKeyDown(event: any) {
      if (event.key === "Enter") this.onSelect();
    },

    onSelect() {
      const name = this.model.value.name || this.model.value;
      this.model.name = name;
      this.model.type = name;
      this.emitUpdateQuery();
    },

    async getProperties() {
      this.propertyOptions = await axios.get(Services.Env.API + "api/entity/public/properties");
      this.propertyOptions = this.clauseOptions.concat(this.propertyOptions);
    },

    async getClasses() {
      this.entityTypeOptions = await axios.get(Services.Env.API + "api/entity/public/classes");
    },

    addChild() {
      const length = this.model.children?.at(-1)?.key || 0;
      const item = { key: length + 1, name: this.model.name } as TreeItem;
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
      this.model.children?.push(item);
      this.emitUpdateQuery();
    }
  }
});
</script>

<style scoped>
ul {
  margin-left: -2rem;
}

ul > ul {
  margin-left: -2rem;
}
</style>
