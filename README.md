# Vaulta — Frontend

React Native 0.83.1 Android app for viewing, uploading, and managing photos with a NestJS backend.

## Prerequisites

- Node.js >=20
- Yarn 1.22
- Android SDK (API 36, build-tools 36.0.0)
- JDK 21
- Physical Android device or emulator
- Backend running (local or Railway)

## Setup

```bash
yarn install
cp .env.example .env   # configure BACKEND_URL
```

## Start

```bash
# Terminal 1: Metro bundler
yarn start

# Terminal 2: Build & install APK
yarn android

# Device → backend (local dev)
adb reverse tcp:3000 tcp:3000
```

## Project structure

```
pages/
  Login/           - Login / Register with JWT
  Home/            - Masonry grid, pull-to-refresh, search, filters, FAB
    index.tsx      - Main home screen
    HomeEmptyState.tsx - Empty state component
    PhotoGridItem.tsx  - Grid photo item
    utils.ts       - Date utilities
  Upload/          - Camera, gallery, video, GPS
  Albums/          - Album list, AlbumView (rename/filter/export), VaultView
    VaultView.tsx  - Vault with PIN + biometric auth, vault sub-albums
  PhotoPreview/    - Full image, zoom, slideshow, download, share, delete, offline
  Profile/         - Stats, export, duplicates, logout
  Trash/           - Restore, empty trash, or permanently delete
  Duplicates/      - Duplicate photo groups by perceptual hash

components/        - 18 shared components (Toast, Skeleton, FAB, VaultaLogo, etc.)
context/           - Auth, Theme, Network, Toast providers
api/               - API client (JWT+refresh), cache, offline, autoSync, notifications, widget, fetchWithTimeout
services/          - Upload queue (MMKV-backed), biometrics
utils/             - calendarLocales, haptics
```

## Key features

- JWT auth with refresh token rotation
- Pull-to-refresh, infinite scroll, masonry grid
- Multi-select: batch download, share, delete, bulk set private
- Albums: create, rename, delete, add/remove photos, album cover
- Vault: PIN + biometric-protected private album with sub-albums
- Trash: soft delete with restore, empty trash, permanent delete
- Duplicate detection by perceptual hash
- Video playback with poster + streaming
- Offline caching (RNFS, with auth headers for video streaming)
- Upload queue (persistent, MMKV-backed, auto-retry)
- Push notifications (Firebase)
- Android home screen widget
- Dark/light/system theme
- Skeleton loaders, fade-in animations
- Toast notifications, error boundaries
- Export photo ZIP by email (Mailgun)
- Recuerdos "On this day"
- Filters: date range, favorites
- Biometric authentication (FaceID / fingerprint)

## Commands

```bash
yarn start             # Metro bundler
yarn android           # Build + install (debug)
npx tsc --noEmit       # Type-check
yarn test              # Run tests
```

## Release APK

Generate a signed release APK and install it on the connected device:

```bash
# 1. Build release APK
cd android && ./gradlew assembleRelease

# 2. Install on connected device
adb install -r app/build/outputs/apk/release/app-release.apk
```

Or as a one-liner:

```bash
cd android && ./gradlew assembleRelease && adb install -r app/build/outputs/apk/release/app-release.apk
```

> Make sure the device is connected (`adb devices`) and USB debugging is enabled.

## Dev notes

- Backend URL from `.env` via `react-native-config`
- Thumbnails generated server-side; grid displays `thumb-*` versions
- After editing TS files: `R` twice or Dev Menu (Cmd+M)
- Native code changes need `yarn android` to recompile
- `adb reverse` must be re-run after USB disconnect
