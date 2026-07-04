export interface AchievementItem {
  achievement_id: string;
  achievement_version: string;
  achievement_title: string;
  achievement_desc_upper: string;
  achievement_desc_lower: string;
  achievement_show_type: string;
  achievement_reward: number;
  achievement_priority: number;
  achievement_icon: string;
  series_id: number;
  series_priority: number;
  achievement_status: number;
  achievement_is_disabled: boolean;
  achievement_finish_date: string;
  achievement_finish_time: string;
  achievement_mutual_exclusive_info: string;
}

export interface SeriesItem {
  series_id: number;
  series_title: string;
  series_icon: string;
  series_priority: number;
  count_total: number;
  count_finished: number;
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
