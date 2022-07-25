import { Helpers } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength }
} = Helpers;
import TreeItem from "./TreeItem";

export function buildQueryFromTreeItem(treeItem: TreeItem) {
  console.log(" ");
  const query = { name: "A new query", description: "A new query built from the query-builder", query: {} };
  recurseBuildQuery(query.query, treeItem, null);
  console.log(query);
  return query;
}

function recurseBuildQuery(query: any, treeItem: TreeItem, parent: TreeItem | null) {
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

function addClause(query: any, treeItem: TreeItem, parent: TreeItem): any {
  if (parent.name === "property" || parent.name === "match") {
    console.log("1");
    addInnerNodeClause(query, treeItem, parent);
  } else if (!treeItem.children?.length) {
    console.log("2");
    addLeafNodeClause(query, treeItem, parent);
  } else if (!isObjectHasKeys(query[parent.name!])) {
    console.log("3");
    query[parent.name!] = {};
  }
}

function addLeafNodeClause(query: any, treeItem: TreeItem, parent: TreeItem) {
  // does not have child nodes
  if (isArrayHasLength(query)) {
    query[0][parent.name!] = treeItem.value;
  } else {
    query[parent.name!] = treeItem.value;
  }
}

function addInnerNodeClause(query: any, treeItem: TreeItem, parent: TreeItem) {
  // has child nodes
  if (!isArrayHasLength(query[parent.name!])) {
    query[parent.name!] = [];
  }
  query[parent.name!].push(treeItem.value);
}

function isProperty(treeItem: TreeItem) {
  if (!isObjectHasKeys(treeItem.value)) {
    return false;
  }
  const keys = Object.keys(treeItem.value);
  return keys.length === 1 && keys.includes("name") && isArrayHasLength(treeItem.children);
}
