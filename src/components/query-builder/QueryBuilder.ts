import { Helpers } from "im-library";
const {
  DataTypeCheckers: { isObjectHasKeys, isArrayHasLength, isObject }
} = Helpers;
import { ITreeItem, TreeItemType, TreeItemValueType } from "./TreeItem";

const log = false;

export function buildQueryFromTreeItem(treeItem: ITreeItem) {
  const query = { name: "A new query", description: "A new query built with the query-builder" };
  recurseBuildQuery(query, treeItem, null);
  return { query: query };
}

function recurseBuildQuery(query: any, treeItem: ITreeItem, parent: ITreeItem | null) {
  if (log) {
    console.log(" ");
    console.log(parent?.name, treeItem.name);
  }

  if (isObjectHasKeys(parent, ["name"])) {
    addClause(query, treeItem, parent!);
  }
  if (isArrayHasLength(treeItem.children)) {
    treeItem.children?.forEach((child, index) => {
      if (parent) {
        if (isArrayHasLength(query)) {
          if (isObjectHasKeys(query[parent.name]) || isArrayHasLength(query[parent.name])) {
            query.at(-1)[parent.name] = query[parent.name];
          }
          recurseBuildQuery(query.at(-1)[parent.name], child, treeItem);
        } else if (isObjectHasKeys(query, [parent.name])) {
          recurseBuildQuery(query[parent.name], child, treeItem);
        }
      } else {
        recurseBuildQuery(query, child, treeItem);
      }
    });
  }
}

function addClause(query: any, treeItem: ITreeItem, parent: ITreeItem): any {
  if (parent.type === TreeItemType.PROPERTY) {
    if (log) console.log("1");
    if (parent.valueType === TreeItemValueType.OBJECT) {
      if (log) console.log("1.1");
      addValueToObject(query, treeItem, parent);
    } else if (parent.valueType === TreeItemValueType.ARRAY) {
      if (log) console.log("1.2");
      addValueToArray(query, treeItem, parent);
    }
  } else if (treeItem.type === TreeItemType.PROPERTY_VALUE_PAIR) {
    if (log) console.log("2");
    addPropertyValuePair(query, treeItem, parent);
  }
}

function addPropertyValuePair(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  const index = query.findIndex((item: any) => item.name === parent.name);
  if (index !== -1)
    switch (treeItem.valueType) {
      case TreeItemValueType.ARRAY:
        if (log) console.log("2.1");
        addArrayPairs(query[index], treeItem);
        break;

      case TreeItemValueType.OBJECT:
        if (log) console.log("2.2");
        query[index][treeItem.name] = treeItem.value.value;
        break;

      default:
        break;
    }
}

function addArrayPairs(query: any, treeItem: ITreeItem) {
  const array = [] as any;
  treeItem.children?.forEach(child => array.push(child.value));
  query[treeItem.name] = array;
}

function addValueToObject(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  if (treeItem.type === TreeItemType.VALUE) {
    if (log) console.log("1.1.1");
    if (isArrayHasLength(query)) {
      query.at(-1)[parent.name] = treeItem.value;
    } else {
      query[parent.name] = treeItem.value;
    }
  } else if (isObjectHasKeys(query[parent.name])) {
    if (log) console.log("1.1.2");
    query[parent.name][treeItem.name] = {};
  } else {
    if (log) console.log("1.1.3");
    query[parent.name] = {};
  }
}

function addValueToArray(query: any, treeItem: ITreeItem, parent: ITreeItem) {
  if (!isArrayHasLength(query[parent.name])) {
    if (log) console.log("1.2.1");
    query[parent.name] = [];
  }

  if (treeItem.type === TreeItemType.VALUE) {
    if (log) console.log("1.2.2");
    if (isArrayHasLength(query)) {
      if (log) console.log("1.2.2.1");
      query.at(-1)[parent.name].push(treeItem.value);
    } else {
      if (log) console.log("1.2.2.2");
      query[parent.name].push(treeItem.value);
    }
  } else {
    if (log) console.log("1.2.3");
    const object = {} as any;
    object[treeItem.name] = treeItem.valueType === TreeItemValueType.ARRAY ? [] : {};
    query[parent.name].push(object);
  }
}
