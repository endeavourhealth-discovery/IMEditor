<template>
  <div id="mini-tree-container">
    <Tree
      :value="root"
      selectionMode="single"
      v-model:selectionKeys="selected"
      :expandedKeys="expandedKeys"
      @node-select="onNodeSelect"
      @node-expand="onNodeExpand"
      class="tree-root"
      :loading="loading"
    >
      <template #default="slotProps">
        <div class="tree-row">
          <span v-if="!slotProps.node.loading">
            <div :style="'color:' + slotProps.node.color">
              <i :class="slotProps.node.typeIcon" class="fa-fw"></i>
            </div>
          </span>
          <ProgressSpinner v-else />
          <span>{{ slotProps.node.label }}</span>
        </div>
      </template>
    </Tree>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, PropType, ref, Ref } from "vue";
import { EntityReferenceNode, TreeNode, TTIriRef } from "im-library/dist/types/interfaces/Interfaces";
import axios from "axios";
import { Helpers, Services } from "im-library";
import { useToast } from "primevue/usetoast";
const {
  Sorters: { byKey },
  ConceptTypeMethods: { getColourFromType, getFAIconFromType },
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
const { EntityService } = Services;

const props = defineProps({
  selectedEntity: { type: Object as PropType<TTIriRef>, required: true }
});

const emit = defineEmits({
  treeNodeSelected: (_payload: TTIriRef) => true
});

const entityService = new EntityService(axios);

const toast = useToast();

let selected: Ref<any> = ref({});
let selectedNode: Ref<TreeNode> = ref({} as TreeNode);
let root: Ref<TreeNode[]> = ref([]);
let loading = ref(true);
let expandedKeys: Ref<any> = ref({});

async function addSelectedToRoot() {
  const asNode = await entityService.getEntityAsEntityReferenceNode(props.selectedEntity["@id"]);
  const hasNode = !!root.value.find(node => node.data === asNode["@id"]);
  if (!hasNode) root.value.push(createTreeNode(asNode.name, asNode["@id"], asNode.type, asNode.hasGrandChildren));
  root.value.sort(byKey);
}

function createTreeNode(conceptName: string, conceptIri: string, conceptTypes: TTIriRef[], hasChildren: boolean): TreeNode {
  return {
    key: conceptName,
    label: conceptName,
    typeIcon: getFAIconFromType(conceptTypes),
    color: getColourFromType(conceptTypes),
    data: conceptIri,
    leaf: !hasChildren,
    loading: false,
    children: [] as TreeNode[]
  };
}

function onNodeSelect(node: any): void {
  selectedNode.value = node;
  emit("treeNodeSelected", { "@id": node.data, name: node.label });
}

async function onNodeExpand(node: any) {
  if (isObjectHasKeys(node)) {
    node.loading = true;
    const children = await entityService.getEntityChildren(node.data);
    children.forEach(child => {
      if (!nodeHasChild(node, child)) node.children.push(createTreeNode(child.name, child["@id"], child.type, child.hasChildren));
    });
    node.loading = false;
  }
}

function nodeHasChild(node: TreeNode, child: EntityReferenceNode) {
  return !!node.children.find(nodeChild => child["@id"] === nodeChild.data);
}

function selectKey(selectedKey: string) {
  Object.keys(selected.value).forEach(key => {
    selected.value[key] = false;
  });
  selected.value[selectedKey] = true;
}

async function findPathToNode(iri: string) {
  loading.value = true;
  let path = [] as any[];
  const result = await entityService.getPathBetweenNodes(iri, props.selectedEntity["@id"]);
  if (isArrayHasLength(result)) path = result;
  if (!isArrayHasLength(path)) {
    loading.value = false;
    return;
  }
  // Recursively expand
  let n = root.value.find(c => path.find(p => p["@id"] === c.data));
  let i = 0;
  if (n) {
    expandedKeys.value = {};
    while (n && n.data != path[0]["@id"] && i++ < 50) {
      selectKey(n.key);
      if (!n.children || n.children.length == 0) {
        await onNodeExpand(n);
      }
      expandedKeys.value[n.key] = true;

      // Find relevant child
      n = n.children.find(c => path.find(p => p["@id"] === c.data));
    }

    if (n && n.data === path[0]["@id"]) {
      selectKey(n.key);
      // Expand node if necessary
      if (!n.children || n.children.length == 0) {
        await onNodeExpand(n);
      }
      for (const gc of n.children) {
        if (gc.data === iri) {
          selectKey(gc.key);
        }
      }
      expandedKeys.value[n.key] = true;
      selectedNode.value = n;
    } else {
      toast.add({
        severity: "warn",
        summary: "Unable to locate",
        detail: "Unable to locate concept in the current hierarchy"
      });
    }
    const container = document.getElementById("quantifier-tree-container") as HTMLElement;
    const highlighted = container.getElementsByClassName("p-highlight")[0];
    if (highlighted) highlighted.scrollIntoView();
  }
}
</script>

<style scoped>
#quantifier-tree-container {
  max-height: 30vh;
  display: flex;
  flex-flow: column nowrap;
}

.loading-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-flow: column;
  justify-content: center;
  align-items: center;
}

.p-tree .p-tree-container .p-treenode .p-treenode-content {
  padding: 0rem !important;
  transition: box-shadow 3600s 3600s !important;
}

.p-tree-toggler {
  margin-right: 0 !important;
}

.tree-root {
  height: 100%;
  overflow: auto;
  border: none;
  padding: 0;
}
.tree-root ::v-deep(.p-tree-toggler) {
  min-width: 2rem;
}

.tree-row .p-progress-spinner {
  width: 1.25em !important;
  height: 1.25em !important;
}

.tree-row {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 0.25rem;
}

#parent-button-bar {
  display: flex;
  flex-flow: row;
  justify-content: flex-start;
  align-items: center;
}

.toggle-buttons-container {
  display: flex;
  flex-flow: row nowrap;
  justify-content: flex-start;
  align-items: center;
}

.tree-locked-button,
.tree-lock-button,
.home-button,
.next-parent-button {
  width: fit-content !important;
}
</style>
