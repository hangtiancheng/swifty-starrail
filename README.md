# lark-star-rail - 星穹铁道工具箱

崩坏：星穹铁道桌面辅助工具，基于 Electron + React 19 + TypeScript 构建。

## 功能

- 成就管理：查看、标记、筛选成就进度，支持米游社自动抓取同步
- 跃迁记录：卡池视图/类型视图切换，SRGF v1.0 / UIGF v4.1 导入导出
- 解锁 120 帧：Windows 国服注册表修改
- 自动更新：基于 electron-updater 的增量更新

## 技术栈

- Electron 39 + electron-vite 5
- React 19 + react-router 7 (hash)
- TypeScript 5.9 + Zod 4
- Tailwind CSS 4
- Zustand 5
- @tanstack/react-virtual 3

## 目录结构

```
src/
  main/               主进程
    service/          IPC handler 实现（achievement, gacha, setting, update, unlock-fps）
    index.ts          窗口创建、托盘、生命周期
  preload/            preload 脚本，暴露 window.api
  renderer/src/       渲染端
    components/       通用组件（toast, alert-dialog, sidebar, dropdown 等）
    hooks/            自定义 hooks（useClickOutside）
    pages/            页面（achievement, gacha, setting）
    stores/           Zustand store（settings, achievement, gacha, textmap）
    routes/           react-router 配置
    assets/           图片资源
  shared/             主/渲染共享类型与 IPC schema
  static/json/        游戏静态数据（AvatarConfig, AchievementData 等）
```

## 开发

```bash
pnpm install
pnpm dev
```

## 类型检查

```bash
pnpm typecheck
```

## 构建

```bash
# Windows
pnpm build:win

# macOS
pnpm build:mac
```

## 工具脚本

- `node fix.mjs` - 修复 electron 二进制未正确安装的问题（网络问题导致 postinstall 失败时使用）
- `node sync.mjs` - 从 Firefly 上游仓库同步静态 JSON 数据和游戏图片资源

## IPC Channel 列表

| 分类  | Channel                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 配置  | config:getAppVersion                                                                                                    |
| 设置  | setting:getAppSettings, setting:setAppSettings                                                                          |
| 成就  | achievement:getUids, getData, newData, delData, exportData, importData, setStatus, refreshFromMYS, cancelRefreshFromMYS |
| 跃迁  | gacha:getUids, getData, newData, delData, exportData, importData, getURL                                                |
| 帧率  | unlockfps:isUnlocked, unlockfps:toggle                                                                                  |
| 更新  | update:checkForUpdates, downloadUpdate, getDownloadInfo, cancelDownload, quitAndInstall                                 |
| 窗口  | window:control                                                                                                          |
| Shell | shell:showItemInFolder                                                                                                  |
| 数据  | static:loadJson                                                                                                         |
