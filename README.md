# MyMega Photos — Frontend

React Native 0.83.1 app for viewing and uploading photos to S3 via the NestJS backend.

## Prerequisites

- Node.js >=20
- Yarn 1.22
- Android SDK (API 36, build-tools 36.0.0)
- JDK 21
- Physical Android device or emulator
- Backend running on `localhost:3000`

## Setup

```bash
yarn install
```

## Start

### 1. Start Metro bundler

```bash
yarn start
```

### 2. Build & run on Android

```bash
# Ensure the device is connected via USB
adb devices

# Run the app
yarn android
```

### 3. Enable device-to-backend communication

```bash
adb reverse tcp:3000 tcp:3000
```

## Dev notes

- The app expects the backend at `http://localhost:3000` (reachable via `adb reverse`)
- After editing TS files, reload the app: press `R` twice or open Dev Menu (`Cmd+M`)
- Thumbnails are generated server-side; the grid displays `thumb-*` versions

## Project structure

```
pages/
  Home/          — Main grid (masonry list with date grouping)
  Upload/        — Photo picker + upload
  PhotoPreview/  — Full-image view, download, share, delete
api/server/      — API client helpers
```
