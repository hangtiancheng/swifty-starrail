import { useMemo } from "react";
import { useGachaStore } from "../../stores";

type GachaRecord = Record<string, Record<string, string>>;

interface GachaTypeViewProps {
  data: GachaRecord;
}

interface TypeStat {
  itemId: string;
  name: string;
  star: number;
  count: number;
}

export function GachaTypeView({ data }: GachaTypeViewProps) {
  const getItemStar = useGachaStore((s) => s.getItemStar);
  const getItemName = useGachaStore((s) => s.getItemName);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of Object.values(data)) {
      counts[item.item_id] = (counts[item.item_id] ?? 0) + 1;
    }
    const result: TypeStat[] = Object.entries(counts).map(
      ([itemId, count]) => ({
        itemId,
        name: getItemName(itemId),
        star: getItemStar(itemId),
        count,
      }),
    );
    result.sort((a, b) => b.star - a.star || b.count - a.count);
    return result;
  }, [data, getItemStar, getItemName]);

  const star5 = stats.filter((s) => s.star === 5);
  const star4 = stats.filter((s) => s.star === 4);
  const star3 = stats.filter((s) => s.star === 3);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
      {star5.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-amber-600">5 星</h3>
          <div className="grid grid-cols-3 gap-2">
            {star5.map((item) => (
              <StatCard key={item.itemId} item={item} color="amber" />
            ))}
          </div>
        </section>
      )}
      {star4.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-purple-600">4 星</h3>
          <div className="grid grid-cols-4 gap-2">
            {star4.map((item) => (
              <StatCard key={item.itemId} item={item} color="purple" />
            ))}
          </div>
        </section>
      )}
      {star3.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium text-blue-600">3 星</h3>
          <div className="grid grid-cols-5 gap-1">
            {star3.map((item) => (
              <div
                key={item.itemId}
                className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600"
              >
                {item.name} x{item.count}
              </div>
            ))}
          </div>
        </section>
      )}
      {stats.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          暂无跃迁记录
        </div>
      )}
    </div>
  );
}

function StatCard({
  item,
  color,
}: {
  item: TypeStat;
  color: "amber" | "purple";
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md px-3 py-2 ${color === "amber" ? "bg-amber-50" : "bg-purple-50"}`}
    >
      <span
        className={`text-sm ${color === "amber" ? "text-amber-700" : "text-purple-700"}`}
      >
        {item.name}
      </span>
      <span
        className={`text-xs ${color === "amber" ? "text-amber-500" : "text-purple-500"}`}
      >
        x{item.count}
      </span>
    </div>
  );
}
