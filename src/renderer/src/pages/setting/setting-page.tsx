import { useEffect, useState, useRef, useCallback } from "react";
import { useSettingsStore } from "../../stores/settings";
import { Switch } from "../../components/switch";
import { toast } from "../../stores/toast";
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
          toast.info("Update failed", info.error ?? "Unknown error");
        }
      }
    }, 500);
  }, [stopPolling]);

  useEffect(() => {
    load();
    window.api.invoke("config:getAppVersion").then(setVersion);
    window.api
      .invoke("unlockFps:isUnlocked")
      .then((res) => setFpsStatus(res.msg));
    return stopPolling;
  }, [stopPolling, load]);

  if (!settings) return null;

  const handleCheckUpdate = async () => {
    setUpdateState("checking");
    const result = await window.api.invoke("update:checkForUpdates");
    setUpdateState(result.state);
    if (result.version) setUpdateVersion(result.version);
    if (result.state === "available") {
      toast.info("New version available", `v${result.version} is available`);
    } else if (result.state === "not-available") {
      toast.info("Up to date", "No updates available");
    } else if (result.state === "error") {
      toast.info("Check failed", "Unable to reach the update server");
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
    const result = await window.api.invoke("unlockFps:toggle");
    if (result.msg === "OK") {
      setFpsStatus(result.fps === 120 ? "unlocked" : "locked");
      toast.info(
        "FPS Setting",
        `${result.fps === 120 ? "Unlocked" : "Locked"} to ${result.fps} FPS`,
      );
    } else {
      toast.info("Operation failed", result.msg);
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-1.5">
      <div className="flex flex-col gap-3 p-4">
        <section className="rounded-md bg-white/50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">General</h2>
          <div className="flex flex-col gap-3">
            <SettingRow
              label="Exit on close"
              description="When disabled, the window minimizes to the tray on close"
            >
              <Switch
                checked={settings.CloseDirectly}
                onChange={(v) => update("CloseDirectly", v)}
              />
            </SettingRow>
            <SettingRow label="Check for updates on launch">
              <Switch
                checked={settings.CheckUpdateOnLaunch}
                onChange={(v) => update("CheckUpdateOnLaunch", v)}
              />
            </SettingRow>
            <SettingRow label="Collapse sidebar by default">
              <Switch
                checked={settings.SidebarCollapsed}
                onChange={(v) => update("SidebarCollapsed", v)}
              />
            </SettingRow>
            <SettingRow label="Debug mode">
              <Switch
                checked={settings.Debug}
                onChange={(v) => update("Debug", v)}
              />
            </SettingRow>
          </div>
        </section>

        <section className="rounded-md bg-white/50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-700">
            Game Settings
          </h2>
          <SettingRow
            label="Unlock 120 FPS"
            description={
              fpsStatus === "unlocked"
                ? "Currently unlocked"
                : fpsStatus === "locked"
                  ? "Currently 60 FPS"
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
          <h2 className="mb-3 text-sm font-medium text-gray-700">About</h2>
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            <p>Star Rail Toolbox v{version}</p>
            <a
              className="inline-flex items-center gap-1 text-purple-500 hover:text-purple-600"
              href="https://github.com/hangtiancheng/swifty-starrail"
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
                  Check for Updates
                </button>
              ) : updateState === "checking" ? (
                <span className="text-xs text-gray-400">
                  Checking for updates...
                </span>
              ) : updateState === "available" ? (
                <button
                  className="inline-flex w-fit items-center gap-1.5 rounded bg-purple-500 px-3 py-1.5 text-xs text-white hover:bg-purple-600"
                  onClick={handleDownloadUpdate}
                >
                  Download v{updateVersion}
                </button>
              ) : updateState === "downloading" ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">
                    Downloading v{updateVersion}...
                  </span>
                  <ProgressBar value={updateProgress} />
                </div>
              ) : updateState === "downloaded" ? (
                <button
                  className="inline-flex w-fit items-center gap-1.5 rounded bg-green-500 px-3 py-1.5 text-xs text-white hover:bg-green-600"
                  onClick={handleInstallUpdate}
                >
                  Restart and Install
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
