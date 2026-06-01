/**
 * Creature Store — Zustand state management.
 *
 * Central store for the creature's runtime state. The widget reads from
 * here, the chat screen writes to it, and persistence is handled via MMKV.
 *
 * This store is UI-framework-agnostic. In a React Native app it's used
 * with the `useCreatureStore` hook; in tests it can be used directly.
 */

import type {
  CreatureState,
  CareAction,
  CareActionResult,
} from '../types/creature';
import type { Species } from '../constants/creatures';
import {
  createCreature,
  restoreCreature,
  performCare,
  ageCreature,
  processConversationTurn,
} from '../services/creature';

// ──────────────────────────────────────────────────────────────
// Store Shape
// ──────────────────────────────────────────────────────────────

export interface CreatureStore {
  // State
  creature: CreatureState | null;
  isLoaded: boolean;
  lastThought: string;
  modelId: string;

  // Actions
  create: (species: Species, name: string, seed?: number) => void;
  restore: (saved: CreatureState) => void;
  care: (action: CareAction) => CareActionResult;
  age: (hours: number) => void;
  chat: (userMessage: string, creatureResponse: string) => void;
  setThought: (thought: string) => void;
  ageCreature: () => void;
  setModelId: (id: string) => void;
  reset: () => void;
}

// ──────────────────────────────────────────────────────────────
// Store Implementation (plain object, not Zustand — for portability)
// ──────────────────────────────────────────────────────────────

/**
 * Creates a creature store instance.
 *
 * In production, this would be wrapped with Zustand's `create()`.
 * For MVP, we use a plain object so the core logic is testable
 * without React/Zustand dependencies.
 *
 * Usage:
 *   const store = makeCreatureStore();
 *   store.create('stardrop', 'Pixel');
 *   const result = store.care('feed');
 */
export function makeCreatureStore(): CreatureStore {
  let creature: CreatureState | null = null;
  let lastThought = '';
  let modelId = 'apple-ondevice';

  const store: CreatureStore = {
    get creature() { return creature; },
    get isLoaded() { return creature !== null; },
    get lastThought() { return lastThought; },
    get modelId() { return modelId; },

    create(species: Species, name: string, seed?: number) {
      creature = createCreature(species, name, seed);
      lastThought = '★ ... ★';
    },

    restore(saved: CreatureState) {
      creature = restoreCreature(saved);
      lastThought = saved.dna.history.keyMemories.at(-1)?.tag ?? '★ ... ★';
    },

    care(action: CareAction): CareActionResult {
      if (!creature) throw new Error('No creature loaded');
      const { state, result } = performCare(creature, action);
      creature = state;
      lastThought = result.creatureResponse;
      return result;
    },

    age(hours: number) {
      if (!creature) throw new Error('No creature loaded');
      creature = ageCreature(creature, hours);
    },

    chat(userMessage: string, creatureResponse: string) {
      if (!creature) throw new Error('No creature loaded');
      creature = processConversationTurn(creature, userMessage, creatureResponse);
      lastThought = creatureResponse;
    },

    setThought(thought: string) {
      lastThought = thought;
    },

    setModelId(id: string) {
      modelId = id;
    },

    ageCreature() {
      if (!creature) return;
      const now = Date.now();
      const hours = (now - new Date(creature.lastInteraction).getTime()) / 3600000;
      creature = ageCreature(creature, hours);
    },

    reset() {
      creature = null;
      lastThought = '';
    },
  };

  return store;
}

// ──────────────────────────────────────────────────────────────
// Example React/Zustand adapter (for reference)
// ──────────────────────────────────────────────────────────────

/**
 * In the actual React Native app, replace the plain store with Zustand:
 *
 * import { create } from 'zustand';
 * import { persist, createJSONStorage } from 'zustand/middleware';
 * import { MMKV } from 'react-native-mmkv';
 *
 * const storage = new MMKV({ id: 'creature-storage' });
 * const zustandStorage = {
 *   getItem: (key: string) => storage.getString(key) ?? null,
 *   setItem: (key: string, value: string) => storage.set(key, value),
 *   removeItem: (key: string) => storage.delete(key),
 * };
 *
 * export const useCreatureStore = create<CreatureStore>()(
 *   persist(
 *     (set, get) => ({
 *       creature: null,
 *       isLoaded: false,
 *       lastThought: '',
 *       create: (species, name, seed?) => { ... },
 *       // ... etc
 *     }),
 *     {
 *       name: 'creature-store',
 *       storage: createJSONStorage(() => zustandStorage),
 *     }
 *   )
 * );
 */
