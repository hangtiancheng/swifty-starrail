import type { SeriesItem } from "./types";

interface AchievementSeriesProps {
  items: SeriesItem[];
  selectedId: number;
  onSelect: (id: number) => void;
}

export function AchievementSeries({
  items,
  selectedId,
  onSelect,
}: AchievementSeriesProps) {
  return (
    <div className="flex w-50 shrink-0 flex-col gap-0.5 overflow-y-auto bg-white/50 p-1">
      {items.map((item) => (
        <button
          key={item.seriesId}
          className={`flex cursor-pointer flex-col rounded px-3 py-2 text-left transition-colors ${
            selectedId === item.seriesId
              ? "bg-purple-100 text-purple-700"
              : "hover:bg-white/50"
          }`}
          onClick={() => onSelect(item.seriesId)}
        >
          <span className="text-sm">{item.seriesTitle}</span>
          <span className="text-xs text-gray-500">
            {item.countFinished}/{item.countTotal}
          </span>
        </button>
      ))}
    </div>
  );
}
