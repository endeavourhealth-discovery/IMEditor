// Categories
// Set, Query Set, Value Set
// Class, Record Type
// Everything else

import { TTIriRef } from "@/models/TripleTree";
import { Vocabulary } from "im-library";

export function isOfTypes(conceptTypeElements: TTIriRef[], ...types: string[]): boolean {
  if (!conceptTypeElements || !conceptTypeElements.length) {
    return false;
  }
  let found = false;
  let index = 0;
  while (!found && index < types.length) {
    if (conceptTypeElements.some((e: any) => e.iri === types[index] || e[Vocabulary.IM.IRI] === types[index])) {
      found = true;
    }
    index++;
  }
  return found;
}

export function isValueSet(conceptTypes: TTIriRef[]): boolean {
  return isOfTypes(
    conceptTypes,
    Vocabulary.IM.SET,
    Vocabulary.IM.QUERY_SET,
    Vocabulary.IM.VALUE_SET,
    Vocabulary.IM.CONCEPT_SET,
    Vocabulary.IM.CONCEPT_SET_GROUP
  );
}

export function isProperty(conceptTypes: TTIriRef[]): boolean {
  return isOfTypes(conceptTypes, Vocabulary.RDF.PROPERTY);
}

export function getFAIconFromType(conceptTypes: TTIriRef[]): string[] {
  if (isOfTypes(conceptTypes, Vocabulary.SHACL.NODESHAPE)) {
    return ["fas", "project-diagram"];
  }

  if (isProperty(conceptTypes)) {
    return ["far", "edit"];
  }

  if (isValueSet(conceptTypes)) {
    return ["fas", "tasks"];
  }

  if (isOfTypes(conceptTypes, Vocabulary.IM.FOLDER)) {
    return ["fas", "folder"];
  }

  if (isOfTypes(conceptTypes, Vocabulary.IM.QUERY_TEMPLATE)) {
    return ["fas", "search"];
  }
  return ["far", "lightbulb"];
}

import * as palette from "../../node_modules/google-palette";
export function getColourFromType(conceptTypes: TTIriRef[]): string {
  const bgs = palette("tol-rainbow", 6);
  const bgsFixed = bgs.map((color: string) => "#" + color + "88");

  if (isOfTypes(conceptTypes, Vocabulary.SHACL.NODESHAPE)) {
    return bgsFixed[0];
  }

  if (isProperty(conceptTypes)) {
    return bgsFixed[5];
  }

  if (isValueSet(conceptTypes)) {
    return bgsFixed[2];
  }

  if (isOfTypes(conceptTypes, Vocabulary.IM.FOLDER)) {
    return bgsFixed[1];
  }

  if (isOfTypes(conceptTypes, Vocabulary.IM.QUERY_TEMPLATE)) {
    return bgsFixed[3];
  }

  return bgsFixed[4];
}
