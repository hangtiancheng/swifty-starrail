import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAchievementStore } from "../../stores";
import { Check } from "lucide-react";
import type { AchievementItem } from "./types";

interface AchievementItemListProps {
  items: AchievementItem[];
  meAchievementMap: Record<string, string[]>;
  selectedSeries: number;
}

const ITEM_HEIGHT = 65;

export function AchievementItemList({
  items,
  meAchievementMap,
  selectedSeries,
}: AchievementItemListProps) {
  const setStatus = useAchievementStore((s) => s.setStatus);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
  }, [selectedSeries]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const handleToggle = (item: AchievementItem) => {
    if (item.achievementIsDisabled) return;
    const newStatus = item.achievementStatus === 2 ? 1 : 2;
    setStatus([item.achievementId], newStatus);
  };

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          return (
            <div
              key={item.achievementId}
              className="absolute top-0 left-0 w-full px-1"
              style={{
                height: `${ITEM_HEIGHT}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={`flex h-full items-center gap-3 rounded-md px-3 transition-colors ${
                  item.achievementIsDisabled
                    ? "opacity-50"
                    : "hover:bg-white/50"
                }`}
              >
                <button
                  className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                    item.achievementStatus === 2
                      ? "border-purple-500 bg-purple-500"
                      : "border-gray-400 bg-white"
                  } ${item.achievementIsDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                  onClick={() => handleToggle(item)}
                  disabled={item.achievementIsDisabled}
                >
                  {item.achievementStatus === 2 && (
                    <Check size={12} className="text-white" />
                  )}
                </button>

                <div className="flex flex-1 flex-col justify-center overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.achievementTitle}
                    </span>
                    {item.achievementShowType && (
                      <span className="shrink-0 rounded bg-gray-200 px-1 text-xs text-gray-500">
                        {item.achievementShowType}
                      </span>
                    )}
                    {meAchievementMap[item.achievementId] && (
                      <span
                        className="shrink-0 rounded bg-purple-100 px-1 text-xs text-purple-600"
                        title={item.achievementMutualExclusiveInfo}
                      >
                        Exclusive
                      </span>
                    )}
                  </div>
                  <span className="truncate text-xs text-gray-500">
                    {item.achievementDescUpper}
                  </span>
                  {item.achievementDescLower && (
                    <span className="truncate text-xs text-gray-400">
                      {item.achievementDescLower}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end text-xs text-gray-400">
                  {item.achievementFinishDate && (
                    <>
                      <span>{item.achievementFinishDate}</span>
                      <span>{item.achievementFinishTime}</span>
                    </>
                  )}
                  <span className="text-purple-500">
                    {item.achievementReward} 星琼
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
