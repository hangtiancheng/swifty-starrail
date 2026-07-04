import { useState, useCallback } from "react";
import { AchievementHead } from "./achievement-head";
import { AchievementSeries } from "./achievement-series";
import { AchievementItemList } from "./achievement-item-list";
import { useAchievementMeta } from "./use-achievement-meta";
import { useAchievementFiltered } from "./use-achievement-filtered";
import { defaultFilter } from "./types";
import type { FilterSetting } from "./types";

export type { FilterSetting } from "./types";

export function Component() {
  const {
    achievementItems,
    seriesItems,
    meAchievementMap,
    achievementDataMap,
  } = useAchievementMeta();

  const [filter, setFilter] = useState<FilterSetting>({ ...defaultFilter });

  const {
    filteredItems,
    seriesWithProgress,
    selectedSeries,
    handleSelectSeries,
    handleSearch,
  } = useAchievementFiltered(
    achievementItems,
    seriesItems,
    meAchievementMap,
    achievementDataMap,
    filter,
  );

  const handleFilterChange = useCallback((f: FilterSetting) => {
    setFilter(f);
  }, []);

  return (
    <div className="flex h-full flex-col gap-1.5 pb-1.5">
      <AchievementHead
        filter={filter}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        defaultFilter={defaultFilter}
      />
      <div className="flex flex-1 gap-0 overflow-hidden rounded-md bg-white/50 shadow-sm">
        <AchievementSeries
          items={seriesWithProgress}
          selectedId={selectedSeries}
          onSelect={handleSelectSeries}
        />
        <AchievementItemList
          items={filteredItems}
          meAchievementMap={meAchievementMap}
          selectedSeries={selectedSeries}
        />
      </div>
    </div>
  );
}
