import axios from "axios";
import { Env } from "im-library";

export default class QueryService {
  static api = Env.api;

  public static async queryIM(query: any) {
    try {
      return await axios.post(this.api + "api/query/public/queryIM", query);
    } catch (error) {
      return [] as any[];
    }
  }
}
