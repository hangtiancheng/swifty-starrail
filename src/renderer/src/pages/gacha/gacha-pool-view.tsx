import { useMemo } from "react";
import { useGachaStore } from "../../stores";

type GachaRecord = Record<string, Record<string, string>>;

interface GachaPoolViewProps {
  data: GachaRecord;
}

interface PoolGroup {
  gachaType: string;
  label: string;
  items: Record<string, string>[];
}

const GACHA_TYPE_LABELS: Record<string, string> = {
  "1": "群星跃迁",
  "2": "始发跃迁",
  "11": "角色活动跃迁",
  "12": "光锥活动跃迁",
};

export function GachaPoolView({ data }: GachaPoolViewProps) {
  const getItemStar = useGachaStore((s) => s.getItemStar);
  const getItemName = useGachaStore((s) => s.getItemName);

  const pools = useMemo(() => {
    const groups: Record<string, Record<string, string>[]> = {};
    for (const item of Object.values(data)) {
      const type = item.gacha_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(item);
    }
    const result: PoolGroup[] = [];
    for (const [type, items] of Object.entries(groups)) {
      items.sort((a, b) => b.id.localeCompare(a.id));
      result.push({
        gachaType: type,
        label: GACHA_TYPE_LABELS[type] ?? `类型 ${type}`,
        items,
      });
    }
    result.sort((a, b) => {
      const order = ["11", "12", "1", "2"];
      return order.indexOf(a.gachaType) - order.indexOf(b.gachaType);
    });
    return result;
  }, [data]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      {pools.map((pool) => (
        <div key={pool.gachaType} className="mb-4">
          <h3 className="mb-2 text-sm font-medium">
            {pool.label}
            <span className="ml-2 text-xs text-gray-400">
              共 {pool.items.length} 抽
            </span>
          </h3>
          <div className="flex flex-wrap gap-1">
            {pool.items
              .filter((item) => getItemStar(item.item_id) >= 4)
              .map((item) => {
                const star = getItemStar(item.item_id);
                return (
                  <div
                    key={item.id}
                    className={`rounded px-2 py-0.5 text-xs ${
                      star === 5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-purple-50 text-purple-600"
                    }`}
                    title={`${item.time}`}
                  >
                    {getItemName(item.item_id)}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      {pools.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          暂无跃迁记录
        </div>
      )}
    </div>
  );
}
