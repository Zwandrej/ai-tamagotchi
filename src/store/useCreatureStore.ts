/**
 * Zustand React Hook — React bindings for the creature store.
 *
 * Persistence: writes creature state to a JSON file in Documents.
 * Plain file I/O via react-native-fs — no MMKV, no native modules needed.
 */

import { create, type StateCreator } from 'zustand';
import RNFS from 'react-native-fs';
import type { CreatureStore } from './creatureStore';
import { makeCreatureStore } from './creatureStore';
import type { CreatureState } from '../types/creature';

// ──────────────────────────────────────────────────────────────
// File-based persistence
// ──────────────────────────────────────────────────────────────

const SAVE_FILE = `${RNFS.DocumentDirectoryPath}/creature_save.json`;

function toJSON(creature: CreatureState | null, lastThought: string): string {
  return JSON.stringify({
    creature: creature ? {
      id: creature.id, name: creature.name, dna: creature.dna,
      stats: creature.stats, personality: creature.personality,
      stage: creature.stage, branch: creature.branch, age: creature.age,
      birthday: creature.birthday, totalInteractions: creature.totalInteractions,
      isSleeping: creature.isSleeping, lastInteraction: creature.lastInteraction,
      isActive: creature.isActive,
    } : null,
    lastThought,
  });
}

function saveToFile(creature: CreatureState | null, lastThought: string): void {
  try {
    RNFS.writeFile(SAVE_FILE, toJSON(creature, lastThought), 'utf8');
  } catch {}
}

function loadFromFile(): { creature: CreatureState | null; lastThought: string } | null {
  try {
    if (!RNFS.exists(SAVE_FILE)) return null;
    const raw = RNFS.readFile(SAVE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed?.creature?.stats) return null;
    // Fill in animation field
    const c = parsed.creature;
    c.animation = { current: 'idle', frame: 0, lastUpdated: new Date().toISOString() };
    return { creature: c, lastThought: parsed.lastThought || '' };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────
// Zustand Store
// ──────────────────────────────────────────────────────────────

interface ZustandCreatureStore extends CreatureStore {
  _hydrate: (c: CreatureState | null, t: string) => void;
}

type Store = ZustandCreatureStore;

const storeCreator: StateCreator<Store, [], []> = (_set, _get) => {
  const plain = makeCreatureStore();

  const update = () => {
    _set({ creature: plain.creature, lastThought: plain.lastThought });
    saveToFile(plain.creature, plain.lastThought);
  };

  return {
    get creature() { return plain.creature; },
    get isLoaded() { return plain.isLoaded; },
    get lastThought() { return plain.lastThought; },
    get modelId() { return plain.modelId; },

    create(species, name, seed?) { plain.create(species, name, seed); update(); },
    care(action) { const r = plain.care(action); update(); return r; },
    chat(msg, resp) { plain.chat(msg, resp); update(); },
    setThought(t) { plain.setThought(t); _set({ lastThought: t }); saveToFile(plain.creature, t); },
    setModelId(id) { plain.setModelId(id); _set({ modelId: id }); },
    ageCreature() { plain.ageCreature(); _set({ creature: plain.creature ? { ...plain.creature } : null }); saveToFile(plain.creature, plain.lastThought); },
    age(h) { plain.age(h); _set({ creature: plain.creature }); saveToFile(plain.creature, plain.lastThought); },

    restore(saved) {
      const full: CreatureState = (saved as any).animation ? saved as CreatureState : { ...saved, animation: { current: 'idle' as const, frame: 0, lastUpdated: new Date().toISOString() } };
      plain.restore(full);
      update();
    },

    reset() { plain.reset(); _set({ creature: null, lastThought: '' }); saveToFile(null, ''); },

    _hydrate(c: CreatureState | null, t: string) {
      if (c) {
        try { plain.restore(c); } catch {}
        plain.lastThought = t || '';
        _set({ creature: plain.creature, lastThought: plain.lastThought });
      }
    },
  };
};

export const useCreatureStore = create<Store>()(storeCreator);

// ──────────────────────────────────────────────────────────────
// Load on startup
// ──────────────────────────────────────────────────────────────

const saved = loadFromFile();
if (saved?.creature) {
  const t = saved.lastThought;
  const c = saved.creature;
  setTimeout(() => { useCreatureStore.getState()._hydrate(c, t); }, 10);
}
