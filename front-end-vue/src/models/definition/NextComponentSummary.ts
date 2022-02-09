import { ComponentType } from "./ComponentType";

export interface NextComponentSummary {
  previousComponentType: ComponentType;
  previousPosition: number;
  parentGroup?: ComponentType;
}
