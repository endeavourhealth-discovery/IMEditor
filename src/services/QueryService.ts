import axios from "axios";
import { Env } from "im-library";

export default class QueryService {
  static api = Env.API;

  public static async queryIM(query: any): Promise<{ entities: any[]; "@context": any }> {
    try {
      return await axios.post(this.api + "api/query/public/queryIM", query);
    } catch (error) {
      return {} as any;
    }
  }
}
