interface SeriesItem {
  series_id: number;
  series_title: string;
  series_icon: string;
  series_priority: number;
  count_total: number;
  count_finished: number;
}

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
          key={item.series_id}
          className={`flex cursor-pointer flex-col rounded px-3 py-2 text-left transition-colors ${
            selectedId === item.series_id
              ? "bg-purple-100 text-purple-700"
              : "hover:bg-white/50"
          }`}
          onClick={() => onSelect(item.series_id)}
        >
          <span className="text-sm">{item.series_title}</span>
          <span className="text-xs text-gray-500">
            {item.count_finished}/{item.count_total}
          </span>
        </button>
      ))}
    </div>
  );
}
