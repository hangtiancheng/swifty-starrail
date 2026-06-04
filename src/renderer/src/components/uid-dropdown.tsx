import { useState } from "react";
import { Dropdown } from "./dropdown";
import { Plus, Trash2 } from "lucide-react";
import { alert } from "./alert-dialog";

interface UidDropdownProps {
  uids: Record<string, string>;
  currentUid: string;
  onSelect: (uid: string) => void;
  onAdd: (uid: string, nickname: string) => Promise<{ msg: string }>;
  onDelete: (uid: string) => Promise<{ msg: string }>;
}

export function UidDropdown({
  uids,
  currentUid,
  onSelect,
  onAdd,
  onDelete,
}: UidDropdownProps) {
  const [adding, setAdding] = useState(false);
  const [newUid, setNewUid] = useState("");
  const [newNickname, setNewNickname] = useState("");

  const options = Object.entries(uids).map(([uid, name]) => ({
    label: `${name} (${uid})`,
    value: uid,
  }));

  const handleAdd = async () => {
    if (!newUid || !newNickname) return;
    await onAdd(newUid, newNickname);
    setAdding(false);
    setNewUid("");
    setNewNickname("");
  };

  const handleDelete = async () => {
    const confirmed = await alert.confirm({
      title: "确认删除",
      content: `确定要删除 UID ${currentUid} 的数据吗？`,
      confirmText: "删除",
      cancelText: "取消",
    });
    if (confirmed) await onDelete(currentUid);
  };

  return (
    <div className="flex items-center gap-2">
      <Dropdown options={options} value={currentUid} onChange={onSelect} />
      <button
        className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 hover:border-purple-400"
        onClick={() => setAdding(true)}
        title="添加 UID"
      >
        <Plus size={14} />
      </button>
      <button
        className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 hover:border-red-400"
        onClick={handleDelete}
        title="删除当前 UID"
      >
        <Trash2 size={14} />
      </button>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-72 rounded-lg bg-white p-5 shadow-lg">
            <h3 className="mb-3 text-sm font-medium">添加 UID</h3>
            <input
              className="mb-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              placeholder="UID（9位数字）"
              value={newUid}
              onChange={(e) => setNewUid(e.target.value)}
            />
            <input
              className="mb-3 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
              placeholder="昵称"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setAdding(false)}
              >
                取消
              </button>
              <button
                className="rounded bg-purple-500 px-3 py-1.5 text-sm text-white hover:bg-purple-600"
                onClick={handleAdd}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
