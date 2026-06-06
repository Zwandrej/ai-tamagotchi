/**
 * Zustand React Hook — React bindings for the creature store.
 *
 * Wraps the plain makeCreatureStore() factory in Zustand's create()
 * with explicit MMKV persistence after every state change.
 * Zustand's persist middleware alone was losing data on force-quit.
 */

import { create, type StateCreator } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import type { CreatureStore } from './creatureStore';
import { makeCreatureStore } from './creatureStore';
import type { CreatureState } from '../types/creature';

// ──────────────────────────────────────────────────────────────
// MMKV Storage
// ──────────────────────────────────────────────────────────────

const storage = new MMKV({ id: 'ai-tamagotchi' });

/** Save the current creature state directly to MMKV — bypasses Zustand middleware */
function forceSave(creature: CreatureState | null, lastThought: string): void {
  try {
    const data = JSON.stringify({
      creature: creature ? toPersisted(creature) : null,
      lastThought,
    });
    storage.set('ai-tamagotchi-creature', data);
  } catch (e) {
    // silently fail — don't crash the app on save error
  }
}

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

// ──────────────────────────────────────────────────────────────
// Persisted shape
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

function fromPersisted(p: PersistedCreature): CreatureState {
  return {
    ...p,
    animation: {
      current: 'idle' as const,
      frame: 0,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// ──────────────────────────────────────────────────────────────
// Zustand Store
// ──────────────────────────────────────────────────────────────

interface ZustandCreatureStore extends CreatureStore {
  _hydrate: () => void;
}

type Store = ZustandCreatureStore;

const storeCreator: StateCreator<Store, [], []> = (_set, _get) => {
  const plain = makeCreatureStore();

  const update = () => {
    _set({ creature: plain.creature, lastThought: plain.lastThought });
    forceSave(plain.creature, plain.lastThought);
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
      // PersistedCreature lacks 'animation' — add it before restoring
      const fullState: CreatureState = (saved as any).animation
        ? (saved as CreatureState)
        : fromPersisted(saved as PersistedCreature);
      plain.restore(fullState);
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
      forceSave(plain.creature, plain.lastThought);
    },

    chat(userMessage, creatureResponse) {
      plain.chat(userMessage, creatureResponse);
      update();
    },

    setThought(thought) {
      plain.setThought(thought);
      _set({ lastThought: thought });
      forceSave(plain.creature, thought);
    },

    setModelId(id: string) {
      plain.setModelId(id);
      _set({ modelId: id });
    },

    ageCreature() {
      plain.ageCreature();
      _set({ creature: plain.creature ? { ...plain.creature } : null });
      forceSave(plain.creature, plain.lastThought);
    },

    reset() {
      plain.reset();
      _set({ creature: null, lastThought: '' });
      forceSave(null, '');
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
        if (!(state.creature as any)?.stats) {
          console.warn('[Store] Corrupted creature data, resetting');
          useCreatureStore.getState().reset();
          return;
        }
        (state as Store)._hydrate();
      }
    },
  })
);
