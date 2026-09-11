export interface AchievementItem {
  achievementId: string;
  achievementVersion: string;
  achievementTitle: string;
  achievementDescUpper: string;
  achievementDescLower: string;
  achievementShowType: string;
  achievementReward: number;
  achievementPriority: number;
  achievementIcon: string;
  seriesId: number;
  seriesPriority: number;
  achievementStatus: number;
  achievementIsDisabled: boolean;
  achievementFinishDate: string;
  achievementFinishTime: string;
  achievementMutualExclusiveInfo: string;
}

export interface SeriesItem {
  seriesId: number;
  seriesTitle: string;
  seriesIcon: string;
  seriesPriority: number;
  countTotal: number;
  countFinished: number;
}

export interface FilterSetting {
  Version: string[];
  InCompFirst: boolean;
  ShowComp: boolean;
  ShowInComp: boolean;
  ShowHidden: boolean;
  ShowVisible: boolean;
  ShowMeOnly: boolean;
}

export const defaultFilter: FilterSetting = {
  Version: [],
  InCompFirst: true,
  ShowComp: false,
  ShowInComp: false,
  ShowHidden: false,
  ShowVisible: false,
  ShowMeOnly: false,
};
