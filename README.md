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
  Upload/          - Camera, gallery, crop, video, GPS
  Albums/          - Album list, AlbumView (rename/filter/export), VaultView (PIN)
  PhotoPreview/    - Full image, zoom, slideshow, download, share, delete, offline
  Profile/         - Stats, export, duplicates, logout
  Trash/           - Restore or permanently delete
  Duplicates/      - Duplicate photo groups by perceptual hash
  Map/             - Geotagged photo markers

components/        - 17 shared components (Toast, Skeleton, FAB, FilterBar, etc.)
context/           - Auth, Theme, Network, Toast providers
api/               - API client (JWT+refresh), cache, offline, notifications, widget
services/          - Upload queue (MMKV-backed)
```

## Key features

- JWT auth with refresh token rotation
- Pull-to-refresh, infinite scroll, masonry grid
- Multi-select: batch download, share, delete
- Albums: create, rename, delete, add/remove photos
- Vault: PIN-protected private album
- Trash: soft delete with restore/permanent delete
- Duplicate detection by perceptual hash
- Video playback with poster + streaming
- Offline caching (RNFS)
- Upload queue (persistent, auto-retry)
- Push notifications (Firebase)
- Android home screen widget
- Dark/light/system theme
- Skeleton loaders, fade-in animations
- Toast notifications, error boundaries
- Export photo ZIP by email (Mailgun)
- Recuerdos "On this day"
- Filters: date range, favorites, blurry

## Commands

```bash
yarn start             # Metro bundler
yarn android           # Build + install
npx tsc --noEmit       # Type-check
yarn test              # Run tests
```

## Dev notes

- Backend URL from `.env` via `react-native-config`
- Thumbnails generated server-side; grid displays `thumb-*` versions
- After editing TS files: `R` twice or Dev Menu (Cmd+M)
- Native code changes need `yarn android` to recompile
- `adb reverse` must be re-run after USB disconnect
