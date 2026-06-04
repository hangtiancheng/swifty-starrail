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
import { toast } from "../../components/toast";
import { useClickOutside } from "../../hooks/use-click-outside";

interface AchievementHeadProps {
  filter: FilterSetting;
  onFilterChange: (filter: FilterSetting) => void;
  onSearch: (str: string) => void;
  defaultFilter: FilterSetting;
}

export function AchievementHead(props: AchievementHeadProps) {
  const { onSearch } = props;
  // filter/onFilterChange/defaultFilter 将在筛选面板 UI 中使用
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
    const result = await useAchievementStore.getState().importData("firefly");
    if (result.msg === "OK") {
      toast.info("导入成功", "成就数据已导入");
    } else if (result.msg !== "Canceled") {
      toast.info("导入失败", result.msg);
    }
  };

  const handleExport = async () => {
    setShowMenu(false);
    const result = await useAchievementStore.getState().exportData("firefly");
    if (result.msg === "OK" && "data" in result) {
      const path = (result as { msg: string; data: { path: string } }).data
        .path;
      if (path) window.api.invoke("shell:showItemInFolder", path);
      toast.info("导出成功", "成就数据已导出");
    } else if (result.msg !== "Canceled") {
      toast.info("导出失败", result.msg);
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
      toast.info("刷新成功", "成就数据已从米游社同步");
    } else if (result.msg !== "Canceled") {
      toast.info("刷新失败", result.msg);
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
          placeholder="搜索成就名称、描述、编号"
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
              刷新
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              onClick={handleImport}
            >
              <Upload size={14} />
              导入
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              onClick={handleExport}
            >
              <Download size={14} />
              导出
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
