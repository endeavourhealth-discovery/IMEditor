export interface ITreeItem {
  key: number;
  name: string;
  type: TreeItemType;
  componentType: ComponentType;
  valueType?: TreeItemValueType;
  value?: any;
  children?: ITreeItem[];
}

export enum TreeItemType {
  PROPERTY = "PROPERTY",
  VALUE = "VALUE",
  PROPERTY_VALUE_PAIR = "PROPERTY_VALUE_PAIR"
}

export enum TreeItemValueType {
  ARRAY = "ARRAY",
  OBJECT = "OBJECT"
}

export enum ComponentType {
  DROPDOWN = "DROPDOWN",
  AUTOCOMPLETE = "AUTOCOMPLETE",
  TEXT = "TEXT",
  DISPLAY = "DISPLAY"
}

export function setComponentType(item: ITreeItem) {
  switch (item.name) {
    case "select":
    case "property":
    case "match":
      item.componentType = ComponentType.DROPDOWN;
      break;

    case "isConcept":
      item.componentType = ComponentType.AUTOCOMPLETE;
      break;

    default:
      item.componentType = ComponentType.TEXT;
      break;
  }
}

export function setType(item: ITreeItem) {
  switch (item.name) {
    case "select":
    case "property":
    case "match":
      item.type = TreeItemType.PROPERTY;
      break;

    case "isConcept":
      item.type = TreeItemType.PROPERTY_VALUE_PAIR;
      break;

    default:
      item.type = TreeItemType.VALUE;
      break;
  }
}

export function setValueType(item: ITreeItem) {
  switch (item.name) {
    case "select":
      item.valueType = TreeItemValueType.OBJECT;
      break;

    case "match":
    case "property":
    case "isConcept":
      item.valueType = TreeItemValueType.ARRAY;
      break;

    default:
      item.valueType = TreeItemValueType.OBJECT;
      break;
  }
}
