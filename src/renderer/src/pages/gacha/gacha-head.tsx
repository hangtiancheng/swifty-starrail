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
import { toast } from "../../stores/toast-store";
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
      toast.info("Fetch succeeded", "跃迁记录 URL obtained");
    } else {
      toast.info("Fetch failed", result.msg);
    }
  };

  const handleImport = async () => {
    setShowMenu(false);
    const result = await useGachaStore.getState().importData("srgf_v1.0");
    if (result.msg === "OK") {
      toast.info("Import succeeded", "跃迁记录 imported");
    } else if (result.msg !== "Canceled") {
      toast.info("Import failed", result.msg);
    }
  };

  const handleExport = async () => {
    setShowMenu(false);
    const result = await useGachaStore.getState().exportData("srgf_v1.0");
    if (result.msg === "OK" && "data" in result) {
      const path = (result as { msg: string; data: { path: string } }).data
        .path;
      if (path) window.api.invoke("shell:showItemInFolder", path);
      toast.info("Export succeeded", "跃迁记录 exported");
    } else if (result.msg !== "Canceled") {
      toast.info("Export failed", result.msg);
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
              Fetch Records
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
