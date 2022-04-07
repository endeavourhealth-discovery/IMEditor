import axios, { CancelToken } from "axios";
import { SimpleMapIri, SearchResponse } from "im-library/dist/types/interfaces/Interfaces";
import {Env} from "im-library";

export default class SetService {
  static api = Env.api;

  public static async download(conceptIri: string, expanded: boolean, v1: boolean) {
    return await axios.get(this.api + "api/set/public/download", {
      params: {
        iri: conceptIri,
        expandMembers: expanded,
        v1: expanded && v1,
        format: "excel"
      },
      responseType: "blob"
    });
  }

  public static async ECLSearch(searchString: string, includeLegacy: boolean, limit: number, cancelToken: CancelToken): Promise<SearchResponse> {
    try {
      return await axios.post(this.api + "api/set/public/eclSearch", searchString, {
        headers: { "Content-Type": "text/plain" },
        params: { includeLegacy: includeLegacy, limit: limit },
        cancelToken: cancelToken
      });
    } catch (error) {
      return {} as SearchResponse;
    }
  }

  public static async evaluateEcl(ecl: string, cancelToken: CancelToken): Promise<SimpleMapIri[]> {
    try {
      return await axios.post(this.api + "api/set/public/evaluateEcl", ecl, { headers: { "Content-Type": "text/plain" }, cancelToken: cancelToken });
    } catch (error) {
      return [] as SimpleMapIri[];
    }
  }
}