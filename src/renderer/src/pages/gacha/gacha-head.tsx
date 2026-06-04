import { useState, useRef, useCallback } from "react";
import {
  Download,
  Upload,
  Link,
  MoreVertical,
  LayoutGrid,
  List,
} from "lucide-react";
import { useGachaStore } from "../../stores";
import { UidDropdown } from "../../components/uid-dropdown";
import { toast } from "../../components/toast";
import { useClickOutside } from "../../hooks/use-click-outside";

interface GachaHeadProps {
  viewMode: "pool" | "type";
  onViewModeChange: (mode: "pool" | "type") => void;
}

export function GachaHead({ viewMode, onViewModeChange }: GachaHeadProps) {
  const { uids, currentUid, setCurrentUid, newUser, deleteUser } =
    useGachaStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setShowMenu(false), []);
  useClickOutside(menuRef, closeMenu, showMenu);

  const handleGetURL = async () => {
    setShowMenu(false);
    const result = await useGachaStore.getState().getGachaURL("cn");
    if (result.msg === "OK" && result.data) {
      await useGachaStore.getState().refreshData("srgf_v1.0", {});
      toast.info("抓取成功", "已获取跃迁记录 URL");
    } else {
      toast.info("抓取失败", result.msg);
    }
  };

  const handleImport = async () => {
    setShowMenu(false);
    const result = await useGachaStore.getState().importData("srgf_v1.0");
    if (result.msg === "OK") {
      toast.info("导入成功", "跃迁记录已导入");
    } else if (result.msg !== "Canceled") {
      toast.info("导入失败", result.msg);
    }
  };

  const handleExport = async () => {
    setShowMenu(false);
    const result = await useGachaStore.getState().exportData("srgf_v1.0");
    if (result.msg === "OK" && "data" in result) {
      const path = (result as { msg: string; data: { path: string } }).data
        .path;
      if (path) window.api.invoke("shell:showItemInFolder", path);
      toast.info("导出成功", "跃迁记录已导出");
    } else if (result.msg !== "Canceled") {
      toast.info("导出失败", result.msg);
    }
  };

  return (
    <div className="flex h-12.5 items-center gap-2.5 rounded-md bg-white/50 px-3 shadow-sm">
      {uids && currentUid && (
        <UidDropdown
          uids={uids}
          currentUid={currentUid}
          onSelect={setCurrentUid}
          onAdd={newUser}
          onDelete={deleteUser}
        />
      )}

      <div className="ml-auto flex items-center gap-1">
        <button
          className={`flex h-8 w-8 items-center justify-center rounded ${viewMode === "pool" ? "bg-purple-100 text-purple-600" : "hover:bg-gray-100"}`}
          onClick={() => onViewModeChange("pool")}
          title="卡池视图"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`flex h-8 w-8 items-center justify-center rounded ${viewMode === "type" ? "bg-purple-100 text-purple-600" : "hover:bg-gray-100"}`}
          onClick={() => onViewModeChange("type")}
          title="类型视图"
        >
          <List size={16} />
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
          <div className="absolute top-full right-0 z-20 mt-1 w-36 rounded-md bg-white py-1 shadow-lg">
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
              onClick={handleGetURL}
            >
              <Link size={14} />
              抓取记录
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
