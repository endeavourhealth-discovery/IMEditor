import { BuilderType } from "./BuilderType";
import { ComponentType } from "./ComponentType";

export interface ComponentDetails {
  id: string;
  value: any;
  position: number;
  type: ComponentType;
  json: any;
  builderType: BuilderType;
}
