# Swifty StarRail

A modern desktop toolbox for **Honkai: Star Rail** — track achievements, analyze your warp history, and unlock the frame rate, all from one clean interface.

Built with Electron, React, and TypeScript. Runs on **Windows** and **macOS**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> [!NOTE]
> This is an unofficial, community-driven tool. It is not affiliated with, endorsed by, or connected to HoYoverse or miHoYo.

## Features

### Achievement tracker

- Browse every achievement grouped by series, with per-series progress and an overall completion percentage.
- Search by name, description, or achievement ID.
- Mark achievements complete manually, with batch operations.
- Automatically detect mutually exclusive achievements — completing one grays out the linked ones.
- Sync completed achievements straight from your account via a miHoYo / HoYoLAB web login (supports CN and global servers).
- Import / export achievement data in the swifty-starrail format for backups and migration.
- Manage multiple UIDs and switch between accounts.

### Warp history analyzer

- Automatically extracts your warp URL from the game's local `WebCache` (locates the game data directory through `Player.log`, then reads the cache files for the auth key).
- Supports both CN (miHoYo) and global (HoYoverse) servers.
- Two views of your data:
  - **Banner view** — grouped by warp type (Character Event, Light Cone Event, Stellar, and Departure Warps), highlighting 5-star and 4-star items.
  - **Type view** — aggregated by item, layered by rarity.
- Import / export using the standard **SRGF v1.0** and **UIGF v4.0 / v4.1** formats for interoperability with other tools.
- Timezone conversion on import (records from non-UTC+8 timezones are normalized to UTC+8).
- Multi-UID support, with UIGF exports able to bundle several UIDs at once.

### Frame rate unlock

- One-click toggle between **60 / 120 FPS**.
- Toggles the `GraphicsSettings` binary value under the `HKCU\SOFTWARE\miHoYo\崩坏：星穹铁道` registry key.

> [!WARNING]
> The frame rate unlock is currently available for the **Windows + CN server** combination only.

### Application settings

- Close behavior: quit or minimize to the system tray.
- Optional update check on launch.
- Collapsible sidebar.
- Debug mode (shows the menu bar and enables DevTools via `Ctrl+Shift+I`).

### Auto-update

- Powered by `electron-updater`, distributed through GitHub Releases.
- Check for updates, view download progress, cancel a download, and restart to install when done.
- Triggered manually or automatically at launch.

### Quality-of-life

- Custom frameless window with title bar controls (minimize, maximize, close).
- System tray with show / hide / quit actions.
- Single-instance lock to prevent duplicate launches.
- Scroll position preserved across route changes, page transition animations, and global toast / confirm dialogs.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [pnpm](https://pnpm.io/) 9+

### Install & run

```bash
# Install dependencies
pnpm install

# Start the dev server with hot reload
pnpm dev
```

### Type checking

```bash
pnpm typecheck
```

## Building

```bash
# Windows (NSIS installer)
pnpm build:win

# macOS (DMG + ZIP)
pnpm build:mac
```

## Releasing

Releases are published to GitHub Releases and power the auto-updater.

```bash
# Dry run — build only, no publish
node scripts/release.mjs

# Publish for Windows
node scripts/release.mjs win

# Publish for macOS
node scripts/release.mjs mac
```

Publishing requires a GitHub token:

```bash
export GH_TOKEN=your_github_token
```

> [!TIP]
> Copy `.env.example` to `.env` and set `GH_TOKEN` there instead of exporting it each time.

## Syncing game data

Static game data and image assets are pulled from the upstream [Firefly](https://github.com/Natrium0521/Firefly) repository:

```bash
node scripts/sync.mjs
```

## Project structure

```
src/
  main/                    Main process
    service/               IPC handler implementations
      config-service       App path management
      setting-service      Settings persistence (Zod validation + atomic writes)
      achievement-service  Achievement data + miHoYo/HoYoLAB sync
      gacha-service        Warp records + SRGF/UIGF import/export
      unlock-fps-service   Frame rate unlock (Windows registry)
      update-service       Auto-update state machine
    logger.ts              pino logger
    index.ts               Window, tray, and lifecycle management
  preload/                 Preload script exposing a typed window.api
  renderer/src/
    components/            Shared components (title bar, sidebar, toast, dialogs, ...)
    hooks/                 Custom hooks
    pages/                 Achievement, gacha, and settings pages
    stores/                Zustand stores
    routes/                react-router hash routing
    assets/                Image resources
  shared/                  Types shared between main and renderer
    ipc-schema.ts          IPC channel definitions and types
    gacha.types.ts         SRGF/UIGF data structures
    static-json.types.ts   Static JSON type definitions
  static/json/             Game static data
scripts/
  sync.mjs                 Sync static data and images from Firefly
  fix.mjs                  Fix Electron binary installation issues
  icon.mjs                 Icon generation
  release.mjs              Release/publish script
```

## Architecture

The app follows Electron's standard three-process architecture, with the main and renderer processes talking over type-safe IPC.

### Type-safe IPC

`src/shared/ipc-schema.ts` defines the full IPC channel surface as an `IpcApi` type. The preload script exposes `window.api.invoke()` based on that type, so renderer-side calls to main-process services get full type inference and argument checking.

### Main-process services

- **ConfigService** — application paths (`userData`, `appData`, settings file location).
- **SettingService** — persistent settings, validated against a Zod schema and written atomically (temp file + rename).
- **AchievementService** — achievement CRUD, miHoYo API fetching (via `BrowserWindow` + `webRequest` interception), import / export.
- **GachaService** — warp record management, game cache URL extraction, SRGF / UIGF conversion.
- **UnlockFpsService** — registry read/write for the frame rate toggle on Windows.
- **UpdateService** — auto-update state machine.

### Renderer state

Zustand stores manage each feature's state:

- `useSettingsStore` — app settings.
- `useAchievementStore` — achievement data and UID management.
- `useGachaStore` — warp data, character / light cone configs, item name resolution.
- `useTextMapStore` — game text mapping (Chinese translation table).
- `useToastStore` / `useAlertStore` — UI notifications.

### Static data

`src/static/json/` holds game data synced from [Firefly](https://github.com/Natrium0521/Firefly):

- `AvatarConfig.json` / `AvatarConfigLD.json` — character configs (limited characters split out).
- `EquipmentConfig.json` — light cone configs.
- `AchievementData.json` / `AchievementSeries.json` / `AchievementVersion.json` — achievements, series, and version mapping.
- `MutualExclusiveAchievement.json` — mutually exclusive achievement relationships.
- `AchievementTextReplaceMap.json` — achievement text replacement map.
- `GachaPoolInfo.json` / `GachaBasicInfo.json` — warp banner info.
- `TextMapCHS.json` — Simplified Chinese text mapping.

## Tech stack

| Layer         | Technology                                                           |
| ------------- | -------------------------------------------------------------------- |
| Desktop shell | Electron 39                                                          |
| Build tooling | electron-vite 5 + Vite 7                                             |
| Frontend      | React 19 + React DOM 19                                              |
| Language      | TypeScript 5.9 (strict)                                              |
| Routing       | react-router 7 (hash mode)                                           |
| State         | Zustand 5                                                            |
| Styling       | Tailwind CSS 4 (via `@tailwindcss/vite`, minified with lightningcss) |
| Validation    | Zod 4                                                                |
| Virtual list  | @tanstack/react-virtual 3                                            |
| Icons         | lucide-react                                                         |
| Logging       | pino + pino-pretty                                                   |
| Telemetry     | @swifty.js/sentry                                                    |
| Packaging     | electron-builder 26 (NSIS for Windows, DMG/ZIP for macOS)            |
| Auto-update   | electron-updater 6 (GitHub Releases)                                 |
| Lint / format | ESLint 9 + Prettier 3 + prettier-plugin-tailwindcss                  |
| Package mgr   | pnpm (workspace)                                                     |
