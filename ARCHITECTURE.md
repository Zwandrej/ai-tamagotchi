# Architecture

## Overview

AI Tamagotchi is a React Native app (bare workflow) with on-device LLM inference via `llama.rn`. The creature is a pure TypeScript state machine that the UI observes reactively.

```
┌────────────────────────────────────────────┐
│                 UI Layer                    │
│  App.tsx (navigation + global clock)       │
│  Screens: Create, Home, Chat, Memory       │
│  Components: CreatureCard, StatBar, etc.   │
├────────────────────────────────────────────┤
│              Store Layer                    │
│  useCreatureStore (Zustand + MMKV)         │
│  creatureStore (plain TS, no framework)    │
├────────────────────────────────────────────┤
│            Engine Layer                     │
│  creatureEngine.ts — pure state machine    │
│  dna.ts — genetics, traits, memory         │
│  AIService.ts — llama.rn inference         │
│  asciiRenderer.ts — Unicode art            │
│  conversationManager.ts — chat state       │
│  WidgetExporter.ts — iOS widget bridge     │
├────────────────────────────────────────────┤
│           Persistence                       │
│  MMKV — creature state, DNA, modelId       │
│  RNFS — downloaded GGUF models             │
└────────────────────────────────────────────┘
```

## Key Design Decisions

### Pure State Machine
All creature logic is pure functions in `creatureEngine.ts`. No side effects, no async. Given a state + action, produces new state. Makes testing trivial and the widget integration possible.

### Zustand + Plain Store
The Zustand store wraps a plain JS store (`creatureStore.ts`). The plain store has no React dependency — it can be used from a widget or headless context. Zustand adds reactivity and persistence.

### Fabric (New Architecture)
RN 0.82 uses Fabric by default on the JS side. The native side must have `RCT_NEW_ARCH_ENABLED = YES` for rendering to work. Without it, the screen shows black.

### MMKV over AsyncStorage
MMKV is ~30x faster and shares data between app extensions (widget) via App Groups.

### llama.rn
`llama.rn` provides a React Native JSI bridge to llama.cpp. Models are GGUF files downloaded from HuggingFace, stored via RNFS.

## Data Flow: Chat Message

1. User types message → `ChatScreen.handleSend()`
2. `addMessage()` appends user message to conversation state
3. `AIService.generateResponse()` builds prompt with creature state + history
4. llama.rn runs inference on-device
5. `processConversationTurn()` applies sentiment analysis, updates happiness, creates memory
6. State saved to MMKV, exported to widget

## Data Flow: Care Action

1. User taps care button → `HomeScreen.handleCare()`
2. `performCare()` applies stat changes, mood shift, evolution check
3. `addMemory()` creates episodic memory with stat snapshot
4. State persisted to MMKV
5. `exportWidgetState()` syncs to shared UserDefaults

## Stat Decay

The global clock in `App.tsx` ticks every 30 seconds, calling `ageCreature()` which calculates elapsed time and applies decay:

| Stat | Rate |
|---|---|
| Hunger | +6 per hour |
| Happiness | -3 per hour |
| Energy | -4 per hour |
| Hygiene | -2 per hour |

Sleeping restores energy at 10× rate.

## Evolution

Age-based thresholds determine stage transitions. Branch is determined at evolution time by current state:

- **Angel**: high empathy + low neglect
- **Gremlin**: high neglect or high independence
- **Trickster**: high mischief gene + high playfulness
- **Sage**: 100+ interactions + high patience
- **Neutral**: none of the above

## Death

Creature dies when 3+ stats are critical (energy=0, hunger=100, hygiene=0, happiness=0). Shows gravestone with reset option.
