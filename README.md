<div align="center">

# CGC 2026 Client

**React Native iOS-first app for Smart Knee BLE pairing, workout sessions, and sensor-driven insights.**

![Platform](https://img.shields.io/badge/platform-iOS%20first-lightgrey?style=flat-square)
![Built with](https://img.shields.io/badge/built%20with-React%20Native-61DAFB?style=flat-square&logo=react)
![Expo](https://img.shields.io/badge/Expo-SDK%2053-000020?style=flat-square&logo=expo)
![State](https://img.shields.io/badge/state-XState%20%2B%20React%20Query-blue?style=flat-square)

[Screenshots](#screenshots) · [Getting Started](#getting-started) · [Architecture](#architecture) · [Project Structure](#project-structure)

</div>

---

## Overview

CGC 2026 Client is an Expo Router mobile app focused on connecting to a Smart Knee device over BLE, collecting session data, and integrating with backend workout APIs. The app combines authenticated API workflows, real-time BLE streaming, and context-driven state composition.  
It is currently implemented with an iOS-first BLE architecture (`react-native-ble-plx`) while still keeping Expo/React Native cross-platform structure.

---

## Screenshots

<img width="2071" height="4184" alt="image" src="https://github.com/user-attachments/assets/c4dd7856-7535-44a5-933e-8d54abdb462f" />


---

## Features

- **BLE device management** - Scan, pair, reconnect, and recover Smart Knee connections with iOS-specific handling.
- **Workout and session flows** - Load workout types/session history and run active workout screens with API-backed data.
- **Sensor streaming pipeline** - Stream sample data from BLE characteristics into app-level providers and services.
- **Auth + secure token handling** - Clerk authentication with secure token storage.
- **CSV export tooling** - Export captured sensor data through iOS export provider flows.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.79 + Expo SDK 53 |
| Navigation | Expo Router (file-based routing) |
| State management | React Context + XState + React Query |
| BLE | `react-native-ble-plx` |
| API Client | Axios-based authenticated client |
| Auth | Clerk (`@clerk/clerk-expo`) + Expo Secure Store |
| Styling/UI | React Native StyleSheet + themed components |
| Language | TypeScript |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Xcode (for iOS Simulator or physical device builds)
- Optional: Android Studio (if you want Android simulator support)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root using `.env.example`.

```env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_BASE_URL=
```

### Running the app

```bash
# Start Expo dev server
npx expo start
```

You can also run native iOS builds directly:

```bash
npx expo run:ios --device
npx expo run:ios --device --configuration Release
npx expo run:ios --device --configuration Release --no-bundler
```

Package scripts:

```bash
npm run start
npm run ios
npm run android
npm run web
```

### Lint

```bash
npm run lint
```

### Reset starter scaffold (optional)

```bash
npm run reset-project
```

This keeps the Expo starter reset behavior in case you still need it for experimentation.

---

## Project Structure

```text
client/
├── app/                    # Expo Router screens/routes
│   ├── (tabs)/             # Main tabbed navigation (home/activities/dev)
│   ├── workout/            # Workout detail routes
│   ├── session/            # Session detail routes
│   ├── bluetooth.tsx       # BLE device discovery/pair UI
│   └── _layout.tsx         # Root provider composition + stack routes
├── contexts/               # App-level providers (BLE, auth, storage, workout, export)
├── services/               # Domain services (knee device, battery, workout APIs)
├── hooks/                  # Reusable hooks (queries, theme, route guards)
├── components/             # UI and feature components
├── constants/              # BLE UUIDs, colors, environment config
├── lib/                    # Helper utilities (BLE connection helpers, auth client, math)
└── types/                  # Shared TypeScript types
```

---

## Architecture

The app composes feature providers in `app/_layout.tsx` to create a clear top-down data and capability flow:

- `QueryProvider` for server state caching and async request orchestration.
- `StorageProvider` for persisted app/device keys.
- `AuthProvider` and `AuthApiProvider` for Clerk auth + authenticated API client.
- `WorkoutAPIProvider` for workout/session backend interactions.
- `BLEProvider` delegating to `IOSBleProvider` on iOS.
- `KneeDeviceProvider`, `CalibrationProvider`, `BatteryProvider`, and `WorkoutProvider` for hardware/session domain logic.

BLE state transitions are managed with XState in the iOS provider (`idle -> scanning -> pairing -> connected`) and wrapped with a type-safe context API for UI usage.

```text
┌─────────────────────────────────────────────────────────────┐
│ UI Layer (Expo Router screens + feature components)         │
├─────────────────────────────────────────────────────────────┤
│ Context Layer (Auth, BLE, KneeDevice, Workout, Battery)     │
├─────────────────────────────────────────────────────────────┤
│ Services Layer (BLE service, workout API service, exports)  │
├─────────────────────────────────────────────────────────────┤
│ Platform + External (iOS BLE stack, Clerk, backend API)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Notes

- BLE functionality is iOS-first and relies on native capabilities unavailable in standard web runtime.
- For best validation of BLE flows, test on a physical iPhone with the target device nearby.
- Integrates with firmware via [BLE](https://github.com/CGC-2026/device-firmware) and the [server](https://github.com/CGC-2026/server) via REST APIs 
