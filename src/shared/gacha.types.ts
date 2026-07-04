export interface GachaItem {
  id: string;
  gacha_id: string;
  gacha_type: string;
  item_id: string;
  time: string;
}

export type GachaRecord = Record<string, GachaItem>;

export interface SrgfInfo {
  srgf_version: string;
  uid: string;
  lang: string;
  region_time_zone: number;
  export_app: string;
  export_app_version: string;
  export_timestamp: number;
}

export interface SrgfData {
  info: SrgfInfo;
  list: GachaItem[];
}

export interface UigfInfo {
  export_app: string;
  export_app_version: string;
  export_timestamp: number;
  version: string;
}

export interface UigfUserNode {
  uid: string;
  lang: string;
  timezone: number;
  list: GachaItem[];
}

export interface UigfData {
  info: UigfInfo;
  hkrpg: UigfUserNode[];
}

export type GachaServerKey = "cn" | "global";
