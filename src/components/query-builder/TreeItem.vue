<template>
  <OverlayPanel v-if="hoveredItem.iri" ref="summary_overlay" id="summary_overlay_panel" style="width: 50vw" :breakpoints="{ '960px': '75vw' }">
    <OverlaySummary :hoveredResult="hoveredItem" />
  </OverlayPanel>
  <ul>
    <div v-if="isDropdown">
      <Dropdown
        v-model="model.value"
        :options="getOptionsFromMap()"
        optionLabel="name"
        :editable="true"
        :filter="true"
        placeholder="Select"
        @keydown="onEnterKeyDown"
        @change="onSelect"
      >
        <template #option="slotProps">
          <div class="hover-name" @mouseenter="showOverlay($event, slotProps.option)" @mouseleave="hideOverlay()">
            {{ slotProps.option.name }}
          </div>
        </template>
      </Dropdown>
    </div>
    <div v-else-if="isAutocomplete">
      <AutoComplete
        v-model="model.value"
        :suggestions="suggestions"
        @complete="searchByTerm($event)"
        field="name"
        @keydown="onEnterKeyDown"
        @item-select="onSelect"
      >
        <template #item="slotProps">
          <div class="hover-name" @mouseenter="showOverlay($event, slotProps.item)" @mouseleave="hideOverlay()">
            {{ slotProps.item.name }}
          </div>
        </template>
      </AutoComplete>
    </div>
    <div v-else-if="isText">
      <InputText v-model="model.value" @keydown="onEnterKeyDown" />
    </div>
    <div v-else @click="toggle">
      <div class="tree-item">
        <i v-if="isFolder" :class="isOpen ? 'pi pi-folder-open' : 'pi pi-folder'"></i>
        {{ model.name }}
        <span class="hover-action-content">
          <span class="hover-action" @click="addChild">
            <i class="pi pi-plus-circle"></i>
          </span>
          <span class="hover-action" v-if="parent" @click="removeChild()"><i class="pi pi-times-circle"></i> </span>
        </span>
      </div>
    </div>
    <ul v-show="isOpen" v-if="isFolder">
      <TreeItem
        class="item"
        v-for="child in model.children"
        v-bind:key="child.key"
        :model="child"
        :parent="model"
        :optionsMap="optionsMap"
        @updateQuery="emitUpdateQuery"
      >
      </TreeItem>
    </ul>
  </ul>
</template>

<script lang="ts">
import { AbortController } from "abortcontroller-polyfill/dist/cjs-ponyfill";
import { defineComponent, PropType } from "vue";
import { ComponentType, ITreeItem, setComponentType, setType, setValueType, TreeItemType, TreeItemValueType } from "./TreeItem";
import { Helpers, Services, Interfaces, Enums } from "im-library";
import axios from "axios";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength, isObject }
} = Helpers;

export default defineComponent({
  name: "TreeItem", // necessary for self-reference
  props: {
    model: { type: Object as PropType<ITreeItem>, required: true },
    parent: { type: Object as PropType<ITreeItem>, required: false },
    optionsMap: { type: Object as PropType<Map<string, Interfaces.TTIriRef[]>>, required: true }
  },
  emits: ["updateQuery"],
  data() {
    return {
      isOpen: true,
      controller: {} as AbortController,
      suggestions: [] as Interfaces.TTIriRef[],
      hoveredItem: {} as any
    };
  },
  computed: {
    isFolder(): boolean {
      return isArrayHasLength(this.model.children);
    },
    isText(): boolean {
      return this.model.componentType === ComponentType.TEXT;
    },
    isDropdown(): boolean {
      return this.model.componentType === ComponentType.DROPDOWN;
    },
    isAutocomplete(): boolean {
      return this.model.componentType === ComponentType.AUTOCOMPLETE;
    }
  },
  methods: {
    isObjectHasKeys(object: any, keys?: []) {
      return isObjectHasKeys(object, keys);
    },
    getOptionsFromMap() {
      if (this.model.name === "isConcept" && this.optionsMap.has(this.parent!.value)) {
        return this.optionsMap.get(this.parent!.value);
      }
      if (!this.optionsMap.has(this.model.name)) {
        return this.optionsMap.get("select");
      }

      return this.optionsMap.get(this.model.name);
    },
    removeChild() {
      if (this.parent && isObjectHasKeys(this.parent) && isArrayHasLength(this.parent.children))
        this.parent.children = this.parent.children?.filter((child: ITreeItem) => {
          return child.key !== this.model.key;
        });
      this.emitUpdateQuery();
    },

    toggle() {
      if (this.isFolder) {
        this.isOpen = !this.isOpen;
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
      if (name === "isConcept") {
        this.model.value = this.parent?.name;
      }
      this.model.name = name;
      setType(this.model);
      setValueType(this.model);
      this.model.componentType = ComponentType.DISPLAY;
      this.emitUpdateQuery();
    },

    async searchByTerm(event: any) {
      if (event.query && event.query.length > 1) {
        const searchRequest = {
          termFilter: event.query,
          sortBy: Enums.SortBy.Usage,
          page: 1,
          size: 100,
          schemeFilter: [],
          statusFilter: [],
          typeFilter: []
        } as unknown as Interfaces.SearchRequest;

        if (!isObject(this.controller)) {
          this.controller.abort();
        }
        this.controller = new AbortController();
        const searchResults = await this.$entityService.advancedSearch(searchRequest, this.controller);
        this.suggestions = searchResults.map(result => {
          return { "@id": result.iri, name: result.name };
        });
      }
    },

    addChild() {
      if (!this.isFolder) {
        this.model.children = [];
      }
      const length = this.model.children?.at(-1)?.key || 0;
      const item = { key: length + 1, name: this.model.name } as ITreeItem;
      const hasOptions = isObjectHasKeys(this.parent) ? this.optionsMap.has(this.parent!.value?.name) : false;
      setComponentType(item, hasOptions);
      this.model.children?.push(item);
      this.emitUpdateQuery();
      this.toggle();
    },

    showOverlay(event: any, data: Interfaces.TTIriRef): void {
      this.hoveredItem = { iri: data["@id"], name: data.name };
      const x = this.$refs.summary_overlay as any;
      if (x) x.show(event, event.target);
    },

    hideOverlay(): void {
      const x = this.$refs.summary_overlay as any;
      if (x) x.hide();
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

.hover-action-content {
  display: none;
  z-index: 1;
}

.hover-action {
  padding: 0.2rem;
}

.hover-action:hover {
  color: brown;
}

.tree-item:hover .hover-action-content {
  display: inline;
}
</style>
