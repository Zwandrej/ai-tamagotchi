# iOS Widget Design

## Architecture

```
React Native App                    Widget Extension
┌──────────────────┐               ┌──────────────────┐
│ WidgetBridge.m   │   App Group   │ CreatureWidget    │
│ (ObjC native)    │──────────────▶│ (SwiftUI)         │
│                  │  UserDefaults │                   │
│ WidgetExporter   │               │ Provider          │
│ (TS bridge)      │               │ Timeline (15min)  │
└──────────────────┘               └──────────────────┘
```

## Data Flow

1. Every state change in the app triggers `exportWidgetState()`
2. `WidgetBridge.exportState(json)` writes to shared `UserDefaults(suiteName: "group.com.zwitter.aitamagotchi")`
3. Widget's `Provider.getTimeline()` reads the JSON
4. Simulates stat decay since last update
5. Renders creature, stats, and mood

## Widget Layout

- **Small**: ASCII creature + name + mood dot + mini stat bars
- **Medium**: Same as small, wider layout

## Stat Decay in Widget

The widget applies the same decay rates as the app between refreshes:
- Hunger: +6/hr, Happiness: -3/hr, Energy: -4/hr, Hygiene: -2/hr

## Setup

Requires App Groups entitlement on both app and widget targets:
`group.com.zwitter.aitamagotchi`

Status: Scaffolded, needs Xcode target configuration to build.
