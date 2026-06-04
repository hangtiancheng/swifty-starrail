import { useGachaStore } from "../../stores";
import { GachaHead } from "./gacha-head";
import { GachaPoolView } from "./gacha-pool-view";
import { GachaTypeView } from "./gacha-type-view";

export function Component() {
  const currentData = useGachaStore((s) => s.currentData);
  const viewMode = useGachaStore((s) => s.viewMode);
  const setViewMode = useGachaStore((s) => s.setViewMode);

  return (
    <div className="flex h-full flex-col gap-1.5 pb-1.5">
      <GachaHead viewMode={viewMode} onViewModeChange={setViewMode} />
      <div className="flex-1 overflow-hidden rounded-md bg-white/50 shadow-sm">
        {currentData && viewMode === "pool" && (
          <GachaPoolView data={currentData} />
        )}
        {currentData && viewMode === "type" && (
          <GachaTypeView data={currentData} />
        )}
      </div>
    </div>
  );
}
