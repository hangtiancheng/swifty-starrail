import { NavLink } from "react-router";
import { Menu, Trophy, Ticket, Settings } from "lucide-react";
import { useSettingsStore } from "../stores/settings";

const navItems = [
  { to: "/achievement", label: "成就管理", icon: Trophy },
  { to: "/gacha", label: "跃迁记录", icon: Ticket },
  { to: "/setting", label: "设置", icon: Settings },
];

export function Sidebar() {
  const collapsed = useSettingsStore(
    (s) => s.settings?.SidebarCollapsed ?? false,
  );
  const update = useSettingsStore((s) => s.update);

  const toggleCollapsed = () => {
    update("SidebarCollapsed", !collapsed);
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-md bg-white/50 shadow-sm transition-all duration-300"
      style={{ width: collapsed ? 60 : 150 }}
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex h-11.25 items-center gap-3 rounded-md px-3 transition-colors ${
                isActive ? "bg-purple-100 text-purple-700" : "hover:bg-white/50"
              }`
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && (
              <span className="text-sm whitespace-nowrap text-black">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <button
        className="flex h-11.25 items-center justify-center hover:bg-white/50"
        onClick={toggleCollapsed}
      >
        <Menu size={20} />
      </button>
    </div>
  );
}
