import { Outlet, useLocation } from "react-router";
import { Suspense, useEffect, useRef, useCallback } from "react";
import { TitleBar } from "../components/title-bar";
import { Sidebar } from "../components/sidebar";
import { ToastContainer, toast } from "../components/toast";
import { AlertDialog } from "../components/alert-dialog";
import {
  useTextMapStore,
  useSettingsStore,
  useAchievementStore,
  useGachaStore,
} from "../stores";

export function RootLayout() {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([
        useSettingsStore.getState().load(),
        useTextMapStore.getState().loadTextMap("TextMapCHS"),
      ]);
      await Promise.all([
        useAchievementStore.getState().init(),
        useGachaStore.getState().init(),
      ]);
      const settings = useSettingsStore.getState().settings;
      if (settings?.CheckUpdateOnLaunch) {
        const result = await window.api.invoke("update:checkForUpdates");
        if (result.state === "available" && result.version) {
          toast.info(
            "发现新版本",
            `v${result.version} 可供更新，前往设置页下载`,
          );
        }
      }
    };
    bootstrap();
  }, []);

  // 路由切换时保存/恢复滚动位置
  const saveScroll = useCallback(() => {
    if (mainRef.current) {
      scrollPositions.current[prevPath.current] = mainRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    saveScroll();
    prevPath.current = location.pathname;
    requestAnimationFrame(() => {
      if (mainRef.current) {
        mainRef.current.scrollTop =
          scrollPositions.current[location.pathname] ?? 0;
      }
    });
  }, [location.pathname, saveScroll]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main ref={mainRef} className="flex-1 overflow-hidden p-1.5">
          <Suspense>
            <div key={location.pathname} className="page-animate h-full">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
      <ToastContainer />
      <AlertDialog />
    </div>
  );
}
