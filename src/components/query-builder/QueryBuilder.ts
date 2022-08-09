import { Helpers } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength, isObject }
} = Helpers;
import { ITreeItem, TreeItemType, TreeItemValueType } from "./TreeItem";

export function buildQueryFromTreeItem(treeItem: ITreeItem) {
  const query = { name: "A new query", description: "A new query built with the query-builder" };
  recurseBuildQuery(query, treeItem, null);
  return { query: query };
}

function recurseBuildQuery(query: any, treeItem: ITreeItem, parent: ITreeItem | null) {
  console.log(" ");
  console.log(parent?.name, treeItem.name);
  if (isObjectHasKeys(parent, ["name"])) {
    addClause(query, treeItem, parent!);
  }
  if (isArrayHasLength(treeItem.children)) {
    treeItem.children?.forEach((child, index) => {
      if (parent) {
        if (isArrayHasLength(query)) {
          // const object = Object.assign([], query[parent.name]);
          query[index][parent.name] = query[parent.name];
          recurseBuildQuery(query[index][parent.name], child, treeItem);
        } else if (isObjectHasKeys(query, [parent.name])) recurseBuildQuery(query[parent.name], child, treeItem);
      } else recurseBuildQuery(query, child, treeItem);
    });
  }
}

function addClause(query: any, treeItem: ITreeItem, parent: ITreeItem): any {
  if (parent.type === TreeItemType.PROPERTY) {
    console.log("1");
    if (parent.valueType === TreeItemValueType.OBJECT) {
      console.log("1.1");
      addValueToObject(query, treeItem, parent);
    } else if (parent.valueType === TreeItemValueType.ARRAY) {
      console.log("1.2");
      addValueToArray(query, treeItem, parent);
    }
  } else if (parent.type === TreeItemType.VALUE) {
    // if (treeItem.type === TreeItemType.PROPERTY_VALUE_PAIR) {
    //   if (treeItem.valueType === TreeItemValueType.ARRAY) {
    //     const array = [] as any[];
    //     treeItem.children?.forEach(child => array.push(child.value));
    //     const object = {} as any;
    //     object[treeItem.name] = array;
    //     query[parent.name] = object;
    //   }
    // }
  }
}

function addValueToObject(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  if (treeItem.type === TreeItemType.VALUE) {
    query[parent.name] = treeItem.value;
  } else if (isObjectHasKeys(query[parent.name])) {
    query[parent.name][treeItem.name] = {};
  } else {
    query[parent.name] = {};
  }
}

function addValueToArray(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  // console.log(query, parent.name);
  console.log(query[parent.name]);
  if (!isArrayHasLength(query[parent.name])) {
    console.log("1.2.1");
    query[parent.name] = [];
  }

  if (treeItem.type === TreeItemType.VALUE) {
    console.log("1.2.2");
    query[parent.name].push(treeItem.value);
  } else {
    console.log("1.2.3");
    const object = {} as any;
    object[treeItem.name] = {};
    query[parent.name].push(object);
  }
}
