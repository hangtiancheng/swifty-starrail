# swifty-starrail

崩坏：星穹铁道桌面工具箱，提供成就管理、跃迁记录分析、帧率解锁等功能。基于 Electron + React + TypeScript 构建，支持 Windows 和 macOS 平台。

## 功能

### 成就管理

- 按系列分类浏览全部成就，显示每个系列的完成进度和总体完成百分比
- 支持按名称、描述或成就 ID 搜索
- 手动标记成就完成状态，支持批量操作
- 自动识别互斥成就关系，完成其中一个后关联项自动置灰
- 通过米游社/HoYoLAB 网页登录抓取成就数据，自动同步已完成的成就（支持国服和国际服）
- 成就数据导入/导出（swifty-starrail 专有格式），方便备份和迁移
- 多 UID 管理，可在不同账号之间切换

### 跃迁记录

- 自动从游戏本地 WebCache 提取抽卡 URL（通过解析 Player.log 定位游戏数据目录，读取 webCaches 中的缓存文件提取 authkey）
- 支持国服（miHoYo）和国际服（HoYoverse）
- 两种数据视图：
  - 卡池视图：按跃迁类型（角色活动跃迁、光锥活动跃迁、群星跃迁、始发跃迁）分组展示，高亮显示 5 星和 4 星物品
  - 类型视图：按物品聚合统计获取次数，按星级分层展示
- 导入/导出支持 SRGF v1.0 和 UIGF v4.0/v4.1 标准格式，可与其他工具互通数据
- 导入时自动处理时区转换（将非 UTC+8 时区的记录统一转为 UTC+8）
- 多 UID 管理，UIGF 导出支持一次性导出多个 UID 的数据

### 帧率解锁

- 一键切换 60/120 FPS（仅 Windows 国服）
- 通过读写注册表 `HKCU\SOFTWARE\miHoYo\崩坏：星穹铁道` 中的 GraphicsSettings 二进制值实现
- 自动查找注册表键名，适配不同版本

### 应用设置

- 关闭行为：退出程序或最小化到系统托盘
- 启动时自动检查更新
- 侧边栏折叠/展开
- 调试模式（启用后显示应用菜单栏，允许通过 Ctrl+Shift+I 打开 DevTools）

### 自动更新

- 基于 electron-updater 实现，通过 GitHub Releases 分发
- 支持检查更新、下载进度展示、取消下载、下载完成后重启安装
- 手动触发或启动时自动检查

### 其他

- 自定义无边框窗口，带有标题栏控制按钮（最小化、最大化、关闭）
- 系统托盘支持，右键菜单可显示/隐藏窗口或退出
- 单实例锁定，防止重复打开
- 路由切换时自动保存和恢复滚动位置
- 页面切换动画
- 全局 Toast 通知和确认对话框

## 技术栈

| 层级     | 技术                                                            |
| -------- | --------------------------------------------------------------- |
| 桌面框架 | Electron 39                                                     |
| 构建工具 | electron-vite 5 + Vite 7                                        |
| 前端框架 | React 19 + React DOM 19                                         |
| 语言     | TypeScript 5.9 (strict)                                         |
| 路由     | react-router 7 (hash mode)                                      |
| 状态管理 | Zustand 5                                                       |
| 样式     | Tailwind CSS 4 (通过 @tailwindcss/vite 集成，lightningcss 压缩) |
| 数据校验 | Zod 4                                                           |
| 虚拟列表 | @tanstack/react-virtual 3                                       |
| 图标     | lucide-react                                                    |
| 日志     | pino + pino-pretty                                              |
| 前端埋点 | @swifty.js/sentry                                               |
| 打包     | electron-builder 26 (NSIS for Windows, DMG/ZIP for macOS)       |
| 自动更新 | electron-updater 6 (GitHub Releases)                            |
| 代码规范 | ESLint 9 + Prettier 3 + prettier-plugin-tailwindcss             |
| 包管理   | pnpm (workspace)                                                |

## 架构

项目采用 Electron 标准的三进程架构，主进程与渲染进程通过类型安全的 IPC 通信。

### IPC 通信设计

`src/shared/ipc-schema.ts` 定义了完整的 IPC 通道类型（`IpcApi`），preload 脚本基于该类型暴露 `window.api.invoke()` 方法，使渲染端调用主进程服务时获得完整的类型推导和参数校验。

### 主进程服务

- `ConfigService` - 应用路径管理（userData、appData、settings 文件路径）
- `SettingService` - 应用设置持久化，基于 Zod schema 校验，原子写入（先写临时文件再 rename）
- `AchievementService` - 成就数据 CRUD、米游社 API 抓取（通过 BrowserWindow + webRequest 拦截）、导入导出
- `GachaService` - 跃迁记录管理、游戏缓存 URL 提取、SRGF/UIGF 格式转换
- `UnlockFpsService` - Windows 注册表读写实现帧率切换
- `UpdateService` - 自动更新状态机管理

### 渲染端状态管理

使用 Zustand store 管理各功能模块状态：

- `useSettingsStore` - 应用设置
- `useAchievementStore` - 成就数据与 UID 管理
- `useGachaStore` - 跃迁数据、角色/光锥配置、物品名称解析
- `useTextMapStore` - 游戏文本映射（中文翻译表）
- `useToastStore` / `useAlertStore` - UI 通知

### 静态数据

`src/static/json/` 存放从 [Firefly](https://github.com/Natrium0521/Firefly) 上游仓库同步的游戏数据，包括：

- `AvatarConfig.json` / `AvatarConfigLD.json` - 角色配置（限定角色单独拆分）
- `EquipmentConfig.json` - 光锥配置
- `AchievementData.json` / `AchievementSeries.json` / `AchievementVersion.json` - 成就数据、系列、版本映射
- `MutualExclusiveAchievement.json` - 互斥成就关系
- `AchievementTextReplaceMap.json` - 成就文本替换映射
- `GachaPoolInfo.json` / `GachaBasicInfo.json` - 卡池信息
- `TextMapCHS.json` - 简体中文文本映射

## 目录结构

```
src/
  main/                  主进程
    service/             IPC handler 实现
      config-service     应用路径管理
      setting-service    设置持久化 (Zod 校验 + 原子写入)
      achievement-service 成就数据管理与米游社同步
      gacha-service      跃迁记录管理与 SRGF/UIGF 导入导出
      unlock-fps-service 帧率解锁 (Windows 注册表)
      update-service     自动更新状态机
    logger.ts            pino 日志
    index.ts             窗口创建、系统托盘、生命周期管理
  preload/               preload 脚本，类型安全的 window.api
  renderer/src/          渲染端
    components/          通用组件 (title-bar, sidebar, toast, alert-dialog, dropdown, switch, checkbox, progress-bar, uid-dropdown, error-boundary)
    hooks/               自定义 hooks (useClickOutside)
    pages/
      achievement/       成就管理页 (系列列表、成就列表、筛选、搜索)
      gacha/             跃迁记录页 (卡池视图、类型视图)
      setting/           设置页 (通用设置、帧率解锁、更新管理)
    stores/              Zustand store
    routes/              react-router hash 路由配置
    assets/              图片资源
  shared/                主/渲染共享类型
    ipc-schema.ts        IPC 通道定义与类型
    gacha.types.ts       SRGF/UIGF 数据结构
    static-json.types.ts 静态 JSON 类型定义
  static/json/           游戏静态数据
scripts/
  sync.mjs               从 Firefly 上游仓库同步静态数据和游戏图片
  fix.mjs                修复 Electron 二进制安装问题
  icon.mjs               图标生成
  release.mjs            发布脚本
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
# Windows (NSIS 安装包)
pnpm build:win

# macOS (DMG + ZIP)
pnpm build:mac
```

## 同步游戏数据

从 Firefly 上游仓库拉取最新的游戏静态数据和图片资源：

```bash
node scripts/sync.mjs
```

## IPC Channel 列表

| 分类  | Channel                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------- |
| 配置  | config:getAppVersion                                                                                                    |
| 设置  | setting:getAppSettings, setting:setAppSettings                                                                          |
| 成就  | achievement:getUids, getData, newData, delData, exportData, importData, setStatus, refreshFromMYS, cancelRefreshFromMYS |
| 跃迁  | gacha:getUids, getData, newData, delData, exportData, importData, getURL                                                |
| 帧率  | unlockFps:isUnlocked, unlockFps:toggle                                                                                  |
| 更新  | update:checkForUpdates, downloadUpdate, getDownloadInfo, cancelDownload, quitAndInstall                                 |
| 窗口  | window:control                                                                                                          |
| Shell | shell:showItemInFolder                                                                                                  |
| 数据  | static:loadJson                                                                                                         |
| 埋点  | sentry:log                                                                                                              |
