export default interface TreeItem {
  key: number;
  name?: string;
  type?: string;
  value?: any;
  children?: TreeItem[];
}
