import { EntityReferenceNode, Namespace, HistoryItem } from "im-library/dist/types/interfaces/Interfaces";
import { User } from "im-library/dist/types/models/Models";

export default interface State {
  history: HistoryItem[];
  currentUser: User;
  isLoggedIn: boolean;
  snomedLicenseAccepted: string;
  editorIri: string;
  snomedReturnUrl: string;
  authReturnUrl: string;
  editorSavedEntity: any;
  blockedIris: string[];
  filterOptions: { status: EntityReferenceNode[]; schemes: Namespace[]; types: EntityReferenceNode[] };
  selectedFilters: { status: EntityReferenceNode[]; schemes: Namespace[]; types: EntityReferenceNode[] };
  quickFiltersStatus: any;
  creatorInvalidEntity: boolean;
  creatorValidity: { key: string; valid: boolean }[];
  editorInvalidEntity: boolean;
  editorValidity: { key: string; valid: boolean }[];
  refreshTree: boolean;
}
