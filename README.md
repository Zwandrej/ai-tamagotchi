# AI Tamagotchi

> An AI-powered digital pet that lives on your phone. Terminal aesthetic. Fully on-device.

A companion creature with real personality, memory, DNA, and evolution — driven by a local LLM running directly on your phone via `llama.rn`. No cloud. No API keys. No data leaves your device.

---

## Features

| Category | Detail |
|---|---|
| 🖥️ **Terminal Aesthetic** | Retro CRT-inspired amber-on-black interface. Creature lives in a command line. |
| 🧠 **On-Device AI** | Real LLM-powered conversations via llama.cpp (`llama.rn`). DNA, personality, mood, stage, and state injected into every response. |
| 🗣️ **Stage-Aware Voice** | Egg → baby talk → child curiosity → teen moodiness → adult personality. Speech evolves with the creature. |
| 📊 **State-Driven Dialogue** | Hunger, energy, happiness, hygiene all affect how the creature talks. It complains when hungry, yawns when tired, begs when sad. |
| 🍎 **Care System** | Feed, play, clean, heal, tuck in, wake up — plus **scold** (negative interaction, -25 happiness). Stats decay over real time. |
| 🧬 **Creature DNA** | Every creature has a unique genetic identity. Traits, personality, and appearance procedurally generated. |
| 🧠 **Episodic Memory** | Rich event-based memories with mood context and stat snapshots. Memory viewer screen. |
| 💬 **Conversation** | Chat affects the creature — kind words boost happiness, mean words hurt (×15 negative multiplier). Terminal-style `$`/`#` prompts. |
| 🦋 **Evolution** | Egg → Baby → Child → Teen → Adult (~18 days real time). 4 branches: Angel, Gremlin, Trickster, Sage. |
| 💀 **Death** | Neglect leads to consequences — the creature can pass away if 3+ stats hit zero. |
| ⏱️ **Real-time Clock** | Stats decay every 30s while the app is open. Age passes in real world time. |
| 💾 **Persistent Storage** | MMKV — full creature state (stats, personality, stage, sleep) survives restarts and phone reboots. |
| 🎨 **Voidling Egg Icon** | Dark inky egg with glowing amber eyes — pixel art on the terminal palette. |
| 🔒 **100% Offline** | No internet required. Everything on-device. Release build pre-compiles Hermes bytecode. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native 0.82 (Fabric / New Architecture) |
| **LLM Inference** | `llama.rn` — React Native binding for llama.cpp |
| **State** | Zustand + MMKV (persistent) |
| **Navigation** | React Navigation (native stack) |
| **Models** | GGUF format, downloaded via `react-native-fs` |
| **Language** | TypeScript (strict) |
| **GPU** | Metal (Apple GPU) — ~50 tok/s on A18 Pro |

---

## Quick Start

```bash
cd ai-tamagotchi
npm install --legacy-peer-deps
cd ios && pod install && cd ..

# Simulator (dev mode):
npx react-native start --port 8081
npx react-native run-ios --simulator="iPhone 17"

# iPhone (release mode — no Metro needed, survives sleep):
npm run ios:release
```

> **Note:** RN 0.82 requires React 19.1.1 (exact). Xcode 26.5 needs `objectVersion` set to 60 for `pod install` (Podfile handles this). fmt library needs consteval→constexpr patch (Podfile post_install hook). Hermes does not support `structuredClone()` — use `JSON.parse(JSON.stringify())` instead.

---

## Project Structure

```
ai-tamagotchi/
├── src/
│   ├── screens/           # CreateCreature, Home, Chat, Memory
│   ├── components/
│   │   └── creature/      # CreatureCard, StatBar, CareButton
│   ├── services/
│   │   └── creature/      # AIService, ModelManager, creatureEngine, dna,
│   │                      # asciiRenderer, conversationManager, WidgetExporter
│   ├── store/             # Zustand (creatureStore, useCreatureStore)
│   ├── types/             # TypeScript types
│   ├── constants/         # Creature art, species config
│   └── theme.ts           # Terminal color palette
├── ios/                   # Xcode project, Pods, WidgetBridge
├── models/                # Downloaded GGUF files (gitignored)
├── __tests__/             # Jest test suites (74 tests)
└── index.js               # App entry
```

---

## Architecture

### Creature State Machine
Pure TypeScript (`creatureEngine.ts`). Every interaction produces a new immutable state. DNA procedurally generated, persisted via MMKV.

### AI Pipeline
1. Model selected at creation → downloads GGUF from HuggingFace
2. On hatch → `llama.rn` loads model into memory
3. Chat → multi-message format with proper system/user/assistant roles
4. System prompt includes: DNA, personality, stage voice, state-driven behavior hints
5. Inference on-device, template fallback if no model

### Stage-Aware Voice
The system prompt injects stage-specific speaking rules:
- **Egg** — single words or sounds only (max 2 words)
- **Baby** — 3-6 word sentences, baby talk, simple emotions
- **Child** — short sentences, curious, asks questions
- **Teen** — growing confidence, occasional moodiness
- **Adult** — full sentences, distinct personality

### State-Driven Dialogue
Hunger, energy, happiness, and hygiene are injected as natural-language behavior hints:
- Hunger > 80 → "⚠️ VERY hungry. Mention food."
- Energy < 20 → "⚠️ EXHAUSTED. Act drowsy, yawn."
- Happiness < 30 → "⚠️ UNHAPPY. Need comfort."
- Hygiene < 30 → "⚠️ DIRTY. Want to be cleaned."

### Memory System
`MemoryGene`: id, tag, event, impact, traitAffected, mood, statsAtTime, timestamp. Capped at 20. View in Memory screen.

### Evolution
- Egg (12h) → Baby (2d) → Child (5d) → Teen (10d) → Adult (∞)
- Branches: Angel (kindness), Gremlin (neglect), Trickster (playfulness+genes), Sage (conversations)

### Death
Energy at 0 + 3 critical stats → creature passes away → gravestone screen → reset option.

### Persistence
- **MMKV**: Full creature state (stats, personality, stage, branch, age, sleep state)
- **RNFS**: Downloaded GGUF models
- **Session-only**: Chat messages

---

## Development Status

- [x] Terminal-themed UI
- [x] Core creature state machine
- [x] DNA system & ASCII renderer
- [x] llama.cpp integration with multi-message chat format
- [x] Chat with LLM + sentiment effects (positive & negative)
- [x] Care system (7 actions: feed, play, clean, heal, tuck_in, wake_up, scold)
- [x] Stage-aware creature voice (speech evolves with age)
- [x] State-driven dialogue (hunger/energy/happiness affect conversation)
- [x] Evolution (5 stages, 4 branches)
- [x] Death mechanic
- [x] Episodic memory + viewer
- [x] Model download & management
- [x] MMKV persistence (full state, survives reboots)
- [x] Real-time stat clock
- [x] Release build with pre-compiled Hermes bytecode
- [x] App icon (voidling egg, amber-on-black)
- [ ] iOS Widget
- [ ] Android support
- [ ] Notifications
- [ ] DNA export & breed mechanics
- [ ] Procedural species generation

---

## License

MIT
