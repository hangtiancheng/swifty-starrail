export interface HashRef {
  Hash: string;
}

export interface AvatarConfigItem {
  AvatarID: number;
  AvatarName: HashRef;
  AvatarFullName: HashRef;
  Rarity: string;
  DamageType: string;
  [key: string]: unknown;
}

export interface EquipmentConfigItem {
  EquipmentID: number;
  EquipmentName: HashRef;
  Rarity: string;
  AvatarBaseType: string;
  [key: string]: unknown;
}

export interface AchievementDataItem {
  AchievementID: number;
  SeriesID: number;
  AchievementTitle: HashRef;
  AchievementDesc: HashRef;
  HideAchievementDesc: HashRef;
  ShowType?: string;
  Rarity?: string;
  Priority?: number;
  ParamList?: { Value: number }[];
  AchievementVersion?: string;
  [key: string]: unknown;
}

export interface AchievementSeriesItem {
  SeriesID: number;
  SeriesTitle: HashRef;
  Priority?: number;
  MainIconPath?: string;
  IconPath?: string;
  [key: string]: unknown;
}

export type TextMap = Record<string, string>;
export type AvatarConfig = Record<string, AvatarConfigItem>;
export type EquipmentConfig = Record<string, EquipmentConfigItem>;
export type AchievementData = Record<string, AchievementDataItem>;
export type AchievementSeries = Record<string, AchievementSeriesItem>;
export type AchievementVersion = Record<string, string[]>;
export type AchievementTextReplaceMap = Record<string, { Hash: string }>;
export type MutualExclusiveAchievement = string[][];
