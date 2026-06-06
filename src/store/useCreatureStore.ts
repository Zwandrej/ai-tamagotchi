/**
 * Creature store with MMKV persistence.
 * Direct MMKV access — no Zustand middleware, no file I/O.
 */

import { create, type StateCreator } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import type { CreatureStore } from './creatureStore';
import { makeCreatureStore } from './creatureStore';
import type { CreatureState } from '../types/creature';

// ──────────────────────────────────────────────────────────────
// Direct MMKV — no middleware, no abstractions
// ──────────────────────────────────────────────────────────────

const mmkv = new MMKV({ id: 'ai-tamagotchi-save' });
const KEY = 'creature';

function save(creature: CreatureState | null, thought: string): void {
  const data = JSON.stringify({
    c: creature ? {
      id: creature.id, name: creature.name,
      dna: creature.dna, stats: creature.stats,
      personality: creature.personality, stage: creature.stage,
      branch: creature.branch, age: creature.age,
      birthday: creature.birthday,
      totalInteractions: creature.totalInteractions,
      isSleeping: creature.isSleeping,
      lastInteraction: creature.lastInteraction,
      isActive: creature.isActive,
    } : null,
    t: thought,
  });
  mmkv.set(KEY, data);
}

function load(): { creature: CreatureState | null; thought: string } | null {
  const raw = mmkv.getString(KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed?.c?.stats) return null;
  const c = parsed.c as CreatureState;
  c.animation = { current: 'idle', frame: 0, lastUpdated: new Date().toISOString() };
  return { creature: c, thought: parsed.t || '' };
}

// ──────────────────────────────────────────────────────────────
// Zustand Store — plain, no persist middleware
// ──────────────────────────────────────────────────────────────

interface ZStore extends CreatureStore {
  _hydrate: (c: CreatureState | null, t: string) => void;
}

const creator: StateCreator<ZStore, [], []> = (_set, _get) => {
  const plain = makeCreatureStore();

  const update = () => {
    _set({ creature: plain.creature, lastThought: plain.lastThought });
    save(plain.creature, plain.lastThought);
  };

  return {
    get creature() { return plain.creature; },
    get isLoaded() { return plain.isLoaded; },
    get lastThought() { return plain.lastThought; },
    get modelId() { return plain.modelId; },

    create(s, n, seed?) { plain.create(s, n, seed); update(); },
    care(a) { const r = plain.care(a); update(); return r; },
    age(h) { plain.age(h); _set({ creature: plain.creature }); save(plain.creature, plain.lastThought); },
    chat(m, r) { plain.chat(m, r); update(); },
    setThought(t) { plain.setThought(t); _set({ lastThought: t }); save(plain.creature, t); },
    setModelId(id) { plain.setModelId(id); _set({ modelId: id }); },
    ageCreature() { plain.ageCreature(); _set({ creature: plain.creature ? { ...plain.creature } : null }); save(plain.creature, plain.lastThought); },

    restore(saved) {
      const full: CreatureState = (saved as any).animation ? saved as CreatureState : { ...saved, animation: { current: 'idle' as const, frame: 0, lastUpdated: new Date().toISOString() } };
      plain.restore(full);
      update();
    },

    reset() { plain.reset(); _set({ creature: null, lastThought: '' }); mmkv.delete(KEY); },

    _hydrate(c, t) {
      if (c) {
        try { plain.restore(c); } catch {}
        plain.lastThought = t || '';
        _set({ creature: plain.creature, lastThought: plain.lastThought });
      }
    },
  };
};

export const useCreatureStore = create<ZStore>()(creator);

// ──────────────────────────────────────────────────────────────
// Load saved creature synchronously at import time
// ──────────────────────────────────────────────────────────────

const saved = load();
if (saved?.creature) {
  useCreatureStore.getState()._hydrate(saved.creature, saved.thought);
}
