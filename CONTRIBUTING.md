# Contributing

## Setup

```bash
npm install --legacy-peer-deps
cd ios && pod install && cd ..
```

> Xcode 26.5 note: if `pod install` fails with object version error, set `objectVersion = 60` in project.pbxproj temporarily.

## Running

```bash
npx react-native start --port 8081
npx react-native run-ios --simulator="iPhone 17"
```

## Project Conventions

- **TypeScript strict** — no `any` without explicit reason
- **Pure functions** in engine layer — no side effects, no async
- **Immutable state** — `deepClone()` for state transitions (JSON-based, Hermes compatible)
- **Terminal theme** — use `Term` from `src/theme.ts` for all colors
- **Font** — Menlo throughout, monospace aesthetic
- **Tests** — `npm test`, aim for high coverage on engine layer

## Key Files

| File | Purpose |
|---|---|
| `src/services/creature/creatureEngine.ts` | Core state machine |
| `src/services/creature/AIService.ts` | LLM integration |
| `src/store/useCreatureStore.ts` | Zustand + MMKV persistence |
| `src/constants/creatures.ts` | Art, species, moods |
| `src/theme.ts` | Terminal color palette |

## Areas to Contribute

- 🎨 **Creature art** — add new species or redesign existing ASCII art
- 🧪 **Model testing** — benchmark GGUF models on real devices  
- 📱 **Android** — port the iOS app to Android
- 🗣️ **Voice** — on-device TTS + STT
- 🔔 **Notifications** — local push for creature needs
- 📊 **Widget** — finish iOS widget integration

## Build Notes

- React 19.1.1 exact (no `^` in package.json)
- Fabric / New Architecture enabled (`RCT_NEW_ARCH_ENABLED = YES`)
- fmt header patch required for Xcode 26.5 (handled by Podfile hook)
- `npm install` needs `--legacy-peer-deps` due to React 19 peer conflicts
