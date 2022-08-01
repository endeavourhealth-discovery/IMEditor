import { Helpers } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
import { ITreeItem } from "./TreeItem";

export function buildQueryFromTreeItem(treeItem: ITreeItem) {
  console.log(" ");
  const query = { name: "A new query", description: "A new query built with the query-builder", query: {} };
  recurseBuildQuery(query.query, treeItem, null);
  console.log(query);
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
      if (parent !== null && parent.name) recurseBuildQuery(query[parent.name], child, treeItem);
      else recurseBuildQuery(query, child, treeItem);
    });
  }
}

function addClause(query: any, treeItem: ITreeItem, parent: ITreeItem): any {
  if (parent.name === "property" || parent.name === "match") {
    console.log("1");
    addPropertyMatchClause(query, treeItem, parent);
  } else if (!treeItem.children?.length) {
    console.log("2");
    addLeafNodeClause(query, treeItem, parent);
  } else if (!isObjectHasKeys(query[parent.name!])) {
    console.log("3");
    query[parent.name!] = {};
  }
}

function addLeafNodeClause(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  // does not have child nodes
  const value = !isObjectHasKeys(treeItem.value, ["@id"]) ? { "@id": treeItem.value } : treeItem.value;
  if (isArrayHasLength(query)) {
    query[0][parent.name!] = value;
  } else {
    query[parent.name!] = value;
  }
}

function addPropertyMatchClause(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  // has child nodes
  if (!isArrayHasLength(query[parent.name!])) {
    query[parent.name!] = [];
  }
  query[parent.name!].push(treeItem.value);
}
