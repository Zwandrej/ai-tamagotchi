# AI Tamagotchi

> An AI-powered digital pet that lives on your phone. Terminal aesthetic. Fully on-device.

A companion creature with real personality, memory, DNA, and evolution — driven by a tiny local LLM running directly on your phone via `llama.rn`. No cloud. No API keys. No data leaves your device.

---

## Features

| Category | Detail |
|---|---|
| 🖥️ **Terminal Aesthetic** | Retro CRT-inspired amber-on-black interface. Creature lives in a command line. |
| 🧠 **On-Device AI** | Real LLM-powered conversations via llama.cpp (`llama.rn`). DNA, personality, mood, and memory injected into every response. |
| 🍎 **Care System** | Feed, play, clean, heal, tuck in, wake up. Stats decay over real time. |
| 🧬 **Creature DNA** | Every creature has a unique genetic identity. Traits, personality, and appearance procedurally generated. |
| 🧠 **Episodic Memory** | Rich event-based memories with mood context and stat snapshots. Memory viewer screen (◫). |
| 💬 **Conversation** | Chat affects the creature — kind words boost happiness, mean words hurt. Terminal-style `$`/`#` prompts. |
| 🦋 **Evolution** | Egg → Baby → Child → Teen → Adult (~18 days real time). 4 branches: Angel, Gremlin, Trickster, Sage. |
| 💀 **Death** | Neglect leads to consequences — the creature can pass away if 3+ stats hit zero. |
| ⏱️ **Real-time Clock** | Stats decay every 30s while the app is open. Age passes in real world time. |
| 💾 **Persistent Storage** | MMKV — creature, DNA, and model selection survive restarts. |
| 🎨 **Pixel Icon** | Custom pixel-art stardrop icon, dark launch screen. |
| 🔒 **100% Offline** | No internet required. Everything on-device. |

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

---

## Quick Start

```bash
cd ai-tamagotchi
npm install --legacy-peer-deps
cd ios && pod install && cd ..
npx react-native start --port 8081
# In another terminal:
npx react-native run-ios --simulator="iPhone 17"
```

> **Note:** RN 0.82 requires React 19.1.1 (exact). Xcode 26.5 needs `objectVersion` set to 60 for `pod install` (Podfile handles this). fmt library needs consteval→constexpr patch (Podfile post_install hook).

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
├── __tests__/             # Jest test suites
└── index.js               # App entry
```

---

## Architecture

### Creature State Machine
Pure TypeScript (`creatureEngine.ts`). Every interaction produces a new immutable state. DNA procedurally generated, persisted via MMKV.

### AI Pipeline
1. Model selected at creation → downloads GGUF from HuggingFace
2. On hatch → `llama.rn` loads model into memory
3. Chat → prompt built with DNA, personality, stats, conversation history
4. Inference on-device, template fallback if no model

### Memory System
`MemoryGene`: id, tag, event, impact, traitAffected, mood, statsAtTime, timestamp. Capped at 20. View in Memory screen.

### Evolution
- Egg (12h) → Baby (2d) → Child (5d) → Teen (10d) → Adult (∞)
- Branches: Angel (kindness), Gremlin (neglect), Trickster (playfulness+genes), Sage (conversations)

### Death
Energy at 0 + 3 critical stats → creature passes away → gravestone screen → reset option.

### Persistence
- **MMKV**: Creature state, DNA, personality, modelId
- **RNFS**: Downloaded GGUF models
- **Session-only**: Chat messages

---

## Development Status

- [x] Terminal-themed UI
- [x] Core creature state machine
- [x] DNA system & ASCII renderer
- [x] llama.cpp integration
- [x] Chat with LLM + sentiment effects
- [x] Care system (6 actions)
- [x] Evolution (5 stages, 4 branches)
- [x] Death mechanic
- [x] Episodic memory + viewer
- [x] Model download & management
- [x] MMKV persistence
- [x] Real-time stat clock
- [x] App icon + launch screen
- [ ] iOS Widget
- [ ] Android support
- [ ] Notifications
- [ ] Voice interaction

---

## License

MIT
