import { useEffect, useState, useRef, useCallback } from "react";
import { useSettingsStore } from "../../stores/settings-store";
import { Switch } from "../../components/switch";
import { toast } from "../../components/toast";
import { ProgressBar } from "../../components/progress-bar";
import { ExternalLink, RefreshCw } from "lucide-react";

export function Component() {
  const { settings, load, update } = useSettingsStore();
  const [version, setVersion] = useState("");
  const [fpsStatus, setFpsStatus] = useState<string>("");
  const [updateState, setUpdateState] = useState<string>("idle");
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateVersion, setUpdateVersion] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      const info = await window.api.invoke("update:getDownloadInfo");
      setUpdateState(info.state);
      setUpdateProgress(info.progress);
      if (
        info.state === "downloaded" ||
        info.state === "error" ||
        info.state === "idle" ||
        info.state === "not-available"
      ) {
        stopPolling();
        if (info.state === "error") {
          toast.info("更新失败", info.error ?? "未知错误");
        }
      }
    }, 500);
  }, [stopPolling]);

  useEffect(() => {
    load();
    window.api.invoke("config:getAppVersion").then(setVersion);
    window.api
      .invoke("unlockfps:isUnlocked")
      .then((res) => setFpsStatus(res.msg));
    return stopPolling;
  }, [stopPolling]);

  if (!settings) return null;

  const handleCheckUpdate = async () => {
    setUpdateState("checking");
    const result = await window.api.invoke("update:checkForUpdates");
    setUpdateState(result.state);
    if (result.version) setUpdateVersion(result.version);
    if (result.state === "available") {
      toast.info("发现新版本", `v${result.version} 可供更新`);
    } else if (result.state === "not-available") {
      toast.info("已是最新版本", "当前无可用更新");
    } else if (result.state === "error") {
      toast.info("检查失败", "无法连接更新服务器");
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateState("downloading");
    setUpdateProgress(0);
    startPolling();
    await window.api.invoke("update:downloadUpdate");
  };

  const handleInstallUpdate = async () => {
    await window.api.invoke("update:quitAndInstall");
  };

  const handleToggleFps = async () => {
    const result = await window.api.invoke("unlockfps:toggle");
    if (result.msg === "OK") {
      setFpsStatus(result.fps === 120 ? "unlocked" : "locked");
      toast.info(
        "帧率设置",
        `已${result.fps === 120 ? "解锁" : "锁定"}为 ${result.fps} FPS`,
      );
    } else {
      toast.info("操作失败", result.msg);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-1.5">
      <div className="flex flex-col gap-3 p-4">
        <section className="rounded-md bg-white/50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">通用设置</h2>
          <div className="flex flex-col gap-3">
            <SettingRow
              label="关闭时直接退出"
              description="关闭后将最小化到托盘"
            >
              <Switch
                checked={settings.CloseDirectly}
                onChange={(v) => update("CloseDirectly", v)}
              />
            </SettingRow>
            <SettingRow label="启动时检查更新">
              <Switch
                checked={settings.CheckUpdateOnLaunch}
                onChange={(v) => update("CheckUpdateOnLaunch", v)}
              />
            </SettingRow>
            <SettingRow label="侧边栏默认折叠">
              <Switch
                checked={settings.SidebarCollapsed}
                onChange={(v) => update("SidebarCollapsed", v)}
              />
            </SettingRow>
            <SettingRow label="调试模式">
              <Switch
                checked={settings.Debug}
                onChange={(v) => update("Debug", v)}
              />
            </SettingRow>
          </div>
        </section>

        <section className="rounded-md bg-white/50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">游戏设置</h2>
          <SettingRow
            label="解锁 120 帧"
            description={
              fpsStatus === "unlocked"
                ? "当前已解锁"
                : fpsStatus === "locked"
                  ? "当前 60 帧"
                  : fpsStatus
            }
          >
            <Switch
              checked={fpsStatus === "unlocked"}
              onChange={handleToggleFps}
              disabled={fpsStatus !== "unlocked" && fpsStatus !== "locked"}
            />
          </SettingRow>
        </section>

        <section className="rounded-md bg-white/50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">关于</h2>
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <p>星穹工具箱 v{version}</p>
            <a
              className="inline-flex items-center gap-1 text-purple-500 hover:text-purple-600"
              href="https://github.com/hangtiancheng/lark-star-rail"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
              <ExternalLink size={12} />
            </a>
            <div className="flex flex-col gap-2">
              {updateState === "idle" ||
              updateState === "not-available" ||
              updateState === "error" ? (
                <button
                  className="inline-flex w-fit items-center gap-1.5 rounded bg-purple-500 px-3 py-1.5 text-xs text-white hover:bg-purple-600"
                  onClick={handleCheckUpdate}
                >
                  <RefreshCw size={12} />
                  检查更新
                </button>
              ) : updateState === "checking" ? (
                <span className="text-xs text-gray-400">正在检查更新...</span>
              ) : updateState === "available" ? (
                <button
                  className="inline-flex w-fit items-center gap-1.5 rounded bg-purple-500 px-3 py-1.5 text-xs text-white hover:bg-purple-600"
                  onClick={handleDownloadUpdate}
                >
                  下载 v{updateVersion}
                </button>
              ) : updateState === "downloading" ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">
                    正在下载 v{updateVersion}...
                  </span>
                  <ProgressBar value={updateProgress} />
                </div>
              ) : updateState === "downloaded" ? (
                <button
                  className="inline-flex w-fit items-center gap-1.5 rounded bg-green-500 px-3 py-1.5 text-xs text-white hover:bg-green-600"
                  onClick={handleInstallUpdate}
                >
                  重启并安装更新
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm">{label}</span>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      {children}
    </div>
  );
}
