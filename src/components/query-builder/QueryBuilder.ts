import { Helpers } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength, isObject }
} = Helpers;
import { ITreeItem, TreeItemType, TreeItemValueType } from "./TreeItem";

export function buildQueryFromTreeItem(treeItem: ITreeItem) {
  const query = { name: "A new query", description: "A new query built with the query-builder", query: {} };
  recurseBuildQuery(query.query, treeItem, null);
  return query;
}

function recurseBuildQuery(query: any, treeItem: ITreeItem, parent: ITreeItem | null) {
  console.log(" ");
  console.log(query, treeItem, parent);
  if (isObjectHasKeys(parent, ["name"])) {
    addClause(query, treeItem, parent!);
  }
  if (isArrayHasLength(treeItem.children)) {
    treeItem.children?.forEach(child => {
      if (parent !== null && isObjectHasKeys(parent, ["name"]) && query[parent.name]) recurseBuildQuery(query[parent.name], child, treeItem);
      else recurseBuildQuery(query, child, treeItem);
    });
  }
}

function addClause(query: any, treeItem: ITreeItem, parent: ITreeItem): any {
  if (parent.type === TreeItemType.PROPERTY) {
    console.log("1");
    addProperty(query, treeItem, parent);
  } else if (treeItem.type === TreeItemType.PROPERTY_VALUE_PAIR) {
    console.log("2");
    addPropertyValue(query, treeItem, parent);
  } else {
    console.log("3");
  }
}

function addPropertyValue(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  if (treeItem.name === "isConcept") addIsConcept(query, treeItem, parent);
}

function addIsConcept(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  console.log(parent.name);
  const isConcept = [] as any;
  treeItem.children?.forEach(child => isConcept.push(child.value));
  const index = (query[0]["property"] as ITreeItem[]).findIndex(treeItem => treeItem.name === parent.name);
  if (index !== -1) {
    query[0]["property"][index]["isConcept"] = isConcept;
  }
}

function addProperty(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  const value = treeItem.type === TreeItemType.PROPERTY ? {} : treeItem.value;
  if (isArrayHasLength(query)) {
    if (!isArrayHasLength(query[0][parent.name])) {
      query[0][parent.name] = [];
    }
    query[0][parent.name].push(value);
  } else if (parent.valueType === TreeItemValueType.ARRAY) {
    if (!isArrayHasLength(query[parent.name])) {
      query[parent.name] = [];
    }
    query[parent.name].push(value);
  } else if (parent.valueType === TreeItemValueType.OBJECT) {
    if (!isObjectHasKeys(query[parent.name])) {
      query[parent.name] = {};
    }
    if (isObjectHasKeys(parent, ["name"]) && isObjectHasKeys(query, [parent.name]) && isObjectHasKeys(value, ["name"]) && query[parent.name][value.name])
      query[parent.name][value.name] = value;
  }
}
