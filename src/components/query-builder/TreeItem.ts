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
  OBJECT = "OBJECT",
  LITERAL = "LITERAL"
}

export enum ComponentType {
  DROPDOWN = "DROPDOWN",
  AUTOCOMPLETE = "AUTOCOMPLETE",
  TEXT = "TEXT",
  DISPLAY = "DISPLAY"
}

export function setComponentType(item: ITreeItem, isConceptHasOptions: boolean) {
  switch (item.name) {
    case "select":
    case "property":
    case "entityType":
    case "notExist":
    case "and":
    case "or":
    case "match":
      item.componentType = ComponentType.DROPDOWN;
      break;

    case "entityId":
      item.componentType = ComponentType.AUTOCOMPLETE;
      break;

    case "isConcept":
      item.componentType = isConceptHasOptions ? ComponentType.DROPDOWN : ComponentType.AUTOCOMPLETE;
      break;

    default:
      item.componentType = ComponentType.DROPDOWN;
      break;
  }
}

export function setType(item: ITreeItem) {
  switch (item.name) {
    case "select":
    case "property":
    case "entityId":
    case "entityType":
    case "match":
    case "and":
    case "or":
      item.type = TreeItemType.PROPERTY;
      break;

    case "isConcept":
    case "includeSubtypes":
    case "notExist":
    case "inverseOf":
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
    case "entityId":
    case "entityType":
    case "notExist":
    case "includeSubtypes":
    case "inverseOf":
      item.valueType = TreeItemValueType.OBJECT;
      break;

    case "match":
    case "property":
    case "isConcept":
    case "and":
    case "or":
      item.valueType = TreeItemValueType.ARRAY;
      break;

    default:
      item.valueType = TreeItemValueType.OBJECT;
      break;
  }
}
