import { DefinitionType } from "./DefinitionType";

export interface NextComponentSummary {
  previousComponentType: DefinitionType;
  previousPosition: number;
  parentGroup?: DefinitionType;
}
