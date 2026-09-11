import { useMemo, useEffect, useCallback, useState, useRef } from "react";
import { useAchievementStore } from "../../stores";
import type { AchievementItem, SeriesItem, FilterSetting } from "./types";

export function useAchievementFiltered(
  achievementItems: AchievementItem[],
  seriesItems: SeriesItem[],
  meAchievementMap: Record<string, string[]>,
  achievementDataMap: Record<string, Record<string, unknown>>,
  filter: FilterSetting,
) {
  const currentData = useAchievementStore((s) => s.currentData);
  const selectedSeries = useAchievementStore((s) => s.selectedSeries);
  const searchString = useAchievementStore((s) => s.searchString);
  const setSelectedSeries = useAchievementStore((s) => s.setSelectedSeries);
  const setSearchString = useAchievementStore((s) => s.setSearchString);

  const [sortKey, setSortKey] = useState(0);
  const orderRef = useRef<string[]>([]);

  const processedItems = useMemo(() => {
    if (!achievementItems.length || !currentData) return achievementItems;
    const items = achievementItems.map((item) => ({ ...item }));
    for (const item of items) {
      const userData = currentData[item.achievement_id] as
        Record<string, unknown> | undefined;
      if (!userData || userData["status"] === 1) {
        if (meAchievementMap[item.achievement_id]) {
          let effected = false;
          for (const meId of meAchievementMap[item.achievement_id]) {
            const meData = currentData[meId] as
              Record<string, unknown> | undefined;
            if (meData && meData["status"] === 2) {
              effected = true;
              break;
            }
          }
          if (effected) continue;
        }
        item.achievement_status = 1;
        item.achievement_is_disabled = false;
        item.achievement_finish_date = "";
        item.achievement_finish_time = "";
      } else if (userData && userData["status"] === 2) {
        const relatedIds = meAchievementMap[item.achievement_id] ?? [
          item.achievement_id,
        ];
        const timeStr = new Date(
          (userData["timestamp"] as number) * 1000,
        ).toLocaleString();
        for (const relItem of items) {
          if (relatedIds.includes(relItem.achievement_id)) {
            relItem.achievement_is_disabled = true;
            relItem.achievement_finish_date = timeStr.split(" ")[0];
            relItem.achievement_finish_time = timeStr.split(" ")[1];
          }
        }
        item.achievement_status = 2;
        item.achievement_is_disabled = false;
      }
    }
    return items;
  }, [achievementItems, currentData, meAchievementMap]);

  const seriesWithProgress = useMemo(() => {
    if (!seriesItems.length || !currentData) return seriesItems;
    const items = seriesItems.map((s) => ({ ...s, count_finished: 0 }));
    const seriesMap: Record<number, SeriesItem> = {};
    for (const s of items) seriesMap[s.series_id] = s;
    const counted = new Set<string>();
    for (const id of Object.keys(currentData)) {
      if (counted.has(id)) continue;
      if (meAchievementMap[id]) {
        for (const meId of meAchievementMap[id]) counted.add(meId);
      }
      counted.add(id);
      const sid = achievementDataMap[id]?.["SeriesID"] as number | undefined;
      if (sid !== undefined && seriesMap[sid]) {
        seriesMap[sid].count_finished++;
        seriesMap[0].count_finished++;
      }
    }
    return items;
  }, [seriesItems, currentData, meAchievementMap, achievementDataMap]);

  useEffect(() => {
    if (seriesWithProgress.length > 0) {
      const all = seriesWithProgress[0];
      const info = `${all.count_finished}/${all.count_total} - ${((all.count_finished / all.count_total) * 100).toFixed(2)}%`;
      useAchievementStore.getState().setHeadInfo(info);
    }
  }, [seriesWithProgress]);

  const filteredItemsUnsorted = useMemo(() => {
    let items = processedItems;
    if (searchString) {
      items = items.filter(
        (item) =>
          searchString === item.achievement_id ||
          `${item.achievement_title}\n${item.achievement_desc_upper}\n${item.achievement_desc_lower}`.includes(
            searchString,
          ),
      );
    } else {
      items = items.filter(
        (item) => selectedSeries === 0 || item.series_id === selectedSeries,
      );
    }
    if (filter.Version.length > 0) {
      items = items.filter((item) =>
        filter.Version.includes(item.achievement_version),
      );
    }
    if (filter.ShowComp || filter.ShowInComp) {
      if (!filter.ShowInComp)
        items = items.filter(
          (item) =>
            item.achievement_is_disabled || item.achievement_status === 2,
        );
      if (!filter.ShowComp)
        items = items.filter(
          (item) =>
            !item.achievement_is_disabled && item.achievement_status === 1,
        );
    }
    if (filter.ShowHidden || filter.ShowVisible) {
      if (!filter.ShowVisible)
        items = items.filter((item) => item.achievement_show_type === "Hidden");
      if (!filter.ShowHidden)
        items = items.filter((item) => item.achievement_show_type === "");
    }
    if (filter.ShowMeOnly) {
      items = items.filter(
        (item) => meAchievementMap[item.achievement_id] !== undefined,
      );
    }
    return items;
  }, [processedItems, selectedSeries, searchString, filter, meAchievementMap]);

  const filteredItems = useMemo(() => {
    const items = [...filteredItemsUnsorted];
    const byPriority = (a: AchievementItem, b: AchievementItem) => {
      const pa =
        a.series_priority * 10000 +
        a.achievement_priority +
        (!a.achievement_is_disabled &&
        a.achievement_status === 1 &&
        filter.InCompFirst
          ? 100000
          : 0);
      const pb =
        b.series_priority * 10000 +
        b.achievement_priority +
        (!b.achievement_is_disabled &&
        b.achievement_status === 1 &&
        filter.InCompFirst
          ? 100000
          : 0);
      return pb - pa;
    };
    // After a status toggle the previous display order is kept so the toggled
    // item does not jump (e.g. to the bottom when it loses its InCompFirst
    // bonus). A fresh priority sort only happens once orderRef is cleared by
    // triggerResort (series switch / search).
    const orderIndex = new Map(
      // eslint-disable-next-line react-hooks/refs -- intentional: reading the tracked display order during the memo is the design
      orderRef.current.map((id, idx) => [id, idx] as const),
    );
    if (orderIndex.size === 0) {
      items.sort(byPriority);
    } else {
      items.sort((a, b) => {
        const ia = orderIndex.get(a.achievement_id);
        const ib = orderIndex.get(b.achievement_id);
        if (ia !== undefined && ib !== undefined) return ia - ib;
        if (ia !== undefined) return -1;
        if (ib !== undefined) return 1;
        return byPriority(a, b);
      });
    }
    return items;
    // sortKey is intentionally included to allow consumers to trigger a re-sort
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItemsUnsorted, sortKey, filter.InCompFirst]);

  // Track the latest displayed order outside of render so reordering can be
  // applied imperatively without mutating refs during render.
  useEffect(() => {
    orderRef.current = filteredItems.map((i) => i.achievement_id);
  }, [filteredItems]);

  const triggerResort = useCallback(() => {
    orderRef.current = [];
    setSortKey((k) => k + 1);
  }, []);

  const handleSelectSeries = useCallback(
    (id: number) => {
      setSelectedSeries(id);
      setSearchString("");
      triggerResort();
    },
    [triggerResort, setSelectedSeries, setSearchString],
  );

  const handleSearch = useCallback(
    (str: string) => {
      setSearchString(str);
      setSelectedSeries(0);
      triggerResort();
    },
    [triggerResort, setSearchString, setSelectedSeries],
  );

  return {
    filteredItems,
    seriesWithProgress,
    selectedSeries,
    handleSelectSeries,
    handleSearch,
  };
}
