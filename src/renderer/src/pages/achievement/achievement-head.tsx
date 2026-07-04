import { useState, useRef, useCallback } from "react";
import {
  Search,
  X,
  MoreVertical,
  RefreshCw,
  Download,
  Upload,
  Loader2,
} from "lucide-react";
import { useAchievementStore } from "../../stores";
import type { FilterSetting } from "./achievement-page";
import { toast } from "../../stores/toast-store";
import { useClickOutside } from "../../hooks/use-click-outside";

interface AchievementHeadProps {
  filter: FilterSetting;
  onFilterChange: (filter: FilterSetting) => void;
  onSearch: (str: string) => void;
  defaultFilter: FilterSetting;
}

export function AchievementHead(props: AchievementHeadProps) {
  const { onSearch } = props;
  // filter/onFilterChange/defaultFilter are reserved for the filter panel UI
  const headInfo = useAchievementStore((s) => s.headInfo);
  const [searchValue, setSearchValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setShowMenu(false), []);
  useClickOutside(menuRef, closeMenu, showMenu);

  const doSearch = (value?: string) => {
    const v = value ?? searchValue;
    onSearch(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doSearch();
  };

  const handleImport = async () => {
    setShowMenu(false);
    const result = await useAchievementStore
      .getState()
      .importData("swifty-starrail");
    if (result.msg === "OK") {
      toast.info("Import succeeded", "Achievement data imported");
    } else if (result.msg !== "Canceled") {
      toast.info("Import failed", result.msg);
    }
  };

  const handleExport = async () => {
    setShowMenu(false);
    const result = await useAchievementStore
      .getState()
      .exportData("swifty-starrail");
    if (result.msg === "OK" && "data" in result) {
      const path = (result as { msg: string; data: { path: string } }).data
        .path;
      if (path) window.api.invoke("shell:showItemInFolder", path);
      toast.info("Export succeeded", "Achievement data exported");
    } else if (result.msg !== "Canceled") {
      toast.info("Export failed", result.msg);
    }
  };

  const handleRefresh = async () => {
    setShowMenu(false);
    const result = await window.api.invoke(
      "achievement:refreshFromMYS",
      true,
      "cn",
    );
    if (result.msg === "OK") {
      await useAchievementStore.getState().init();
      toast.info("Refresh succeeded", "Achievement data synced from 米游社");
    } else if (result.msg !== "Canceled") {
      toast.info("Refresh failed", result.msg);
    }
  };

  return (
    <div className="flex h-12.5 items-center gap-2.5 rounded-md bg-white/50 px-3 shadow-sm">
      {headInfo === "Loading" ? (
        <Loader2 size={18} className="animate-spin text-gray-400" />
      ) : (
        <span className="text-lg">{headInfo}</span>
      )}

      <div className="relative flex flex-1 items-center">
        <input
          className="h-10 w-full rounded-md bg-white/70 px-3 pr-16 text-sm outline-none hover:bg-white/90 focus:bg-white"
          placeholder="Search by name, description, or ID"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        {searchValue && (
          <button
            className="absolute right-10 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setSearchValue("");
              doSearch("");
            }}
          >
            <X size={14} />
          </button>
        )}
        <button
          className="absolute right-3 text-gray-500 hover:text-gray-700"
          onClick={() => doSearch()}
        >
          <Search size={16} />
        </button>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-500 text-white hover:bg-purple-600"
          onClick={() => setShowMenu(!showMenu)}
        >
          <MoreVertical size={16} />
        </button>
        {showMenu && (
          <div className="absolute top-full right-0 z-20 mt-1 w-32 rounded-md bg-white py-1 shadow-lg">
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              onClick={handleRefresh}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              onClick={handleImport}
            >
              <Upload size={14} />
              Import
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              onClick={handleExport}
            >
              <Download size={14} />
              Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
