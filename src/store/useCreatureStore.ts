/**
 * Zustand React Hook — React bindings for the creature store.
 *
 * Wraps the plain makeCreatureStore() factory in Zustand's create()
 * so React components can subscribe to creature state reactively.
 * The plain store (makeCreatureStore) remains available for tests
 * and non-React use.
 *
 * Persistence: uses Zustand's persist middleware. Storage is
 * pluggable — defaults to an in-memory fallback. Swap to MMKV
 * via `setStorage()` when running on-device.
 */

import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { CreatureStore } from './creatureStore';
import { makeCreatureStore } from './creatureStore';
import type { CreatureState } from '../types/creature';
import { exportWidgetState } from '../services/creature/WidgetExporter';

// ──────────────────────────────────────────────────────────────
// MMKV Storage — persists to device, survives app restarts
// ──────────────────────────────────────────────────────────────

const storage = new MMKV({ id: 'ai-tamagotchi' });

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

// ──────────────────────────────────────────────────────────────
// Persisted shape — only what survives app restarts
// ──────────────────────────────────────────────────────────────

interface PersistedCreature {
  id: string;
  name: string;
  dna: CreatureState['dna'];
  stats: CreatureState['stats'];
  personality: CreatureState['personality'];
  stage: CreatureState['stage'];
  branch: CreatureState['branch'];
  age: number;
  birthday: string;
  totalInteractions: number;
  isSleeping: boolean;
  lastInteraction: string;
  isActive: boolean;
}

interface PersistedState {
  creature: PersistedCreature | null;
  lastThought: string;
  modelId: string;
}

function toPersisted(creature: CreatureState | null): PersistedCreature | null {
  if (!creature) return null;
  return {
    id: creature.id,
    name: creature.name,
    dna: creature.dna,
    stats: creature.stats,
    personality: creature.personality,
    stage: creature.stage,
    branch: creature.branch,
    age: creature.age,
    birthday: creature.birthday,
    totalInteractions: creature.totalInteractions,
    isSleeping: creature.isSleeping,
    lastInteraction: creature.lastInteraction,
    isActive: creature.isActive,
  };
}

// ──────────────────────────────────────────────────────────────
// Zustand Store
// ──────────────────────────────────────────────────────────────

interface ZustandCreatureStore extends CreatureStore {
  /** Re-hydrate the store from a serialized state (called by persist) */
  _hydrate: () => void;
}

type Store = ZustandCreatureStore;

const storeCreator: StateCreator<Store, [], []> = (_set, _get) => {
  const plain = makeCreatureStore();

  const update = () => {
    _set({ creature: plain.creature, lastThought: plain.lastThought });
    exportWidgetState(plain.creature);
  };

  return {
    get creature() { return plain.creature; },
    get isLoaded() { return plain.isLoaded; },
    get lastThought() { return plain.lastThought; },
    get modelId() { return plain.modelId; },

    create(species, name, seed?) {
      plain.create(species, name, seed);
      update();
    },

    restore(saved) {
      plain.restore(saved);
      update();
    },

    care(action) {
      const result = plain.care(action);
      update();
      return result;
    },

    age(hours) {
      plain.age(hours);
      _set({ creature: plain.creature });
    },

    chat(userMessage, creatureResponse) {
      plain.chat(userMessage, creatureResponse);
      update();
    },

    setThought(thought) {
      plain.setThought(thought);
      _set({ lastThought: thought });
    },

    setModelId(id: string) {
      plain.setModelId(id);
      _set({ modelId: id });
    },

    ageCreature() {
      plain.ageCreature();
      _set({ creature: plain.creature ? { ...plain.creature } : null });
      // Persist immediately after stat decay — critical for device sleep/wake cycles
      if (plain.creature) {
        useCreatureStore.persist.setOptions({}); // no-op to trigger re-persist
      }
    },

    reset() {
      plain.reset();
      _set({ creature: null, lastThought: '' });
    },

    _hydrate() {
      update();
    },
  };
};

export const useCreatureStore = create<Store>()(
  persist(storeCreator, {
    name: 'ai-tamagotchi-creature',
    storage: createJSONStorage(() => mmkvStorage),
    partialize: (state) => ({
      creature: toPersisted(state.creature),
      lastThought: state.lastThought,
    }) as PersistedState,
    onRehydrateStorage: () => (state) => {
      if (state?.creature) {
        // Migration: if creature data is corrupted (missing stats), reset
        if (!(state.creature as any)?.stats) {
          console.warn('[Store] Corrupted creature data, resetting');
          useCreatureStore.getState().reset();
          return;
        }
        // Cast: persist middleware hands us PersistedState, but _hydrate
        // uses makeCreatureStore's internal state which is already restored
        (state as Store)._hydrate();
      }
    },
  })
);
