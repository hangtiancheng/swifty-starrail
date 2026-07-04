import { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAchievementStore } from "../../stores";
import { Check } from "lucide-react";

interface AchievementItem {
  achievement_id: string;
  achievement_title: string;
  achievement_desc_upper: string;
  achievement_desc_lower: string;
  achievement_show_type: string;
  achievement_reward: number;
  achievement_status: number;
  achievement_is_disabled: boolean;
  achievement_finish_date: string;
  achievement_finish_time: string;
  achievement_mutual_exclusive_info: string;
}

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
    if (item.achievement_is_disabled) return;
    const newStatus = item.achievement_status === 2 ? 1 : 2;
    setStatus([item.achievement_id], newStatus);
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
              key={item.achievement_id}
              className="absolute top-0 left-0 w-full px-1"
              style={{
                height: `${ITEM_HEIGHT}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={`flex h-full items-center gap-3 rounded-md px-3 transition-colors ${
                  item.achievement_is_disabled
                    ? "opacity-50"
                    : "hover:bg-white/50"
                }`}
              >
                <button
                  className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                    item.achievement_status === 2
                      ? "border-purple-500 bg-purple-500"
                      : "border-gray-400 bg-white"
                  } ${item.achievement_is_disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                  onClick={() => handleToggle(item)}
                  disabled={item.achievement_is_disabled}
                >
                  {item.achievement_status === 2 && (
                    <Check size={12} className="text-white" />
                  )}
                </button>

                <div className="flex flex-1 flex-col justify-center overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {item.achievement_title}
                    </span>
                    {item.achievement_show_type && (
                      <span className="shrink-0 rounded bg-gray-200 px-1 text-xs text-gray-500">
                        {item.achievement_show_type}
                      </span>
                    )}
                    {meAchievementMap[item.achievement_id] && (
                      <span
                        className="shrink-0 rounded bg-purple-100 px-1 text-xs text-purple-600"
                        title={item.achievement_mutual_exclusive_info}
                      >
                        Exclusive
                      </span>
                    )}
                  </div>
                  <span className="truncate text-xs text-gray-500">
                    {item.achievement_desc_upper}
                  </span>
                  {item.achievement_desc_lower && (
                    <span className="truncate text-xs text-gray-400">
                      {item.achievement_desc_lower}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end text-xs text-gray-400">
                  {item.achievement_finish_date && (
                    <>
                      <span>{item.achievement_finish_date}</span>
                      <span>{item.achievement_finish_time}</span>
                    </>
                  )}
                  <span className="text-purple-500">
                    {item.achievement_reward} 星琼
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
