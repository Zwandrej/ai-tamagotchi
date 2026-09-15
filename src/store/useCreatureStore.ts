/**
 * Creature store with MMKV persistence.
 * Direct MMKV access — no Zustand middleware, no file I/O.
 */

import { create, type StateCreator } from 'zustand';
import { MMKV } from 'react-native-mmkv';
import type { CreatureStore } from './creatureStore';
import { makeCreatureStore } from './creatureStore';
import type { CreatureState } from '../types/creature';
import { hydrateDownloadedModels, restoreLoadedModel } from '../services/creature/AIService';

// ──────────────────────────────────────────────────────────────
// Direct MMKV — no middleware, no abstractions
// ──────────────────────────────────────────────────────────────

const mmkv = new MMKV({ id: 'ai-tamagotchi-save' });
const KEY = 'creature';

function save(creature: CreatureState | null, thought: string, modelId?: string): void {
  const data = JSON.stringify({
    c: creature ? {
      id: creature.id, name: creature.name,
      dna: creature.dna, stats: creature.stats,
      personality: creature.personality, stage: creature.stage,
      branch: creature.branch, age: creature.age,
      birthday: creature.birthday,
      totalInteractions: creature.totalInteractions,
      isSleeping: creature.isSleeping,
      tuckedInAt: creature.tuckedInAt,
      lastInteraction: creature.lastInteraction,
      isActive: creature.isActive,
    } : null,
    t: thought,
    // Which brain the creature was hatched with. Without this the choice was
    // lost on every restart and the app had no way to reload it.
    // Callers must pass it explicitly: JSON.stringify drops undefined, so an
    // omitted argument does not leave the field alone — it erases it.
    m: modelId,
  });
  mmkv.set(KEY, data);
}

function load(): { creature: CreatureState | null; thought: string; modelId?: string } | null {
  const raw = mmkv.getString(KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (!parsed?.c?.stats) return null;
  const c = parsed.c as CreatureState;
  c.animation = { current: 'idle', frame: 0, lastUpdated: new Date().toISOString() };
  return { creature: c, thought: parsed.t || '', modelId: parsed.m };
}

// ──────────────────────────────────────────────────────────────
// Zustand Store — plain, no persist middleware
// ──────────────────────────────────────────────────────────────

interface ZStore extends CreatureStore {
  _hydrate: (c: CreatureState | null, t: string, modelId?: string) => void;
}

const creator: StateCreator<ZStore, [], []> = (_set, _get) => {
  const plain = makeCreatureStore();

  const update = () => {
    _set({ creature: plain.creature, lastThought: plain.lastThought });
    save(plain.creature, plain.lastThought, plain.modelId);
  };

  return {
    get creature() { return plain.creature; },
    get isLoaded() { return plain.isLoaded; },
    get lastThought() { return plain.lastThought; },
    get modelId() { return plain.modelId; },

    create(species, name, seed?) { plain.create(species, name, seed); update(); },
    createFromDNA(dna: any, name: string) { plain.createFromDNA(dna, name); update(); },
    care(action) { const r = plain.care(action); update(); return r; },
    age(h) { plain.age(h); _set({ creature: plain.creature }); save(plain.creature, plain.lastThought, plain.modelId); },
    chat(m, r) { plain.chat(m, r); update(); },
    setThought(t) { plain.setThought(t); _set({ lastThought: t }); save(plain.creature, t, plain.modelId); },
    setModelId(id) {
      plain.setModelId(id);
      _set({ modelId: id });
      // Persist immediately: the model is chosen in the create flow, and the
      // creature may not be saved again before the app is killed.
      save(plain.creature, plain.lastThought, id);
    },
    ageCreature() { plain.ageCreature(); _set({ creature: plain.creature ? { ...plain.creature } : null }); save(plain.creature, plain.lastThought, plain.modelId); },

    restore(saved) {
      const full: CreatureState = (saved as any).animation ? saved as CreatureState : { ...saved, animation: { current: 'idle' as const, frame: 0, lastUpdated: new Date().toISOString() } };
      plain.restore(full);
      update();
    },

    reset() { plain.reset(); _set({ creature: null, lastThought: '' }); mmkv.delete(KEY); },

    _hydrate(c, t, modelId) {
      if (modelId) {
        plain.setModelId(modelId);
        _set({ modelId });
      }
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
  useCreatureStore.getState()._hydrate(saved.creature, saved.thought, saved.modelId);
}

// Rebuild what the filesystem already knows, then bring back the creature's
// model. Both are fire-and-forget: the UI renders immediately with the template
// engine and upgrades itself once the model is resident.
hydrateDownloadedModels()
  .then((found) => {
    // 'apple-ondevice' means "no downloadable model". Every creature created
    // before the create screen was fixed still carries it, because that screen
    // hardcoded it as the default and never recorded the row actually picked,
    // so it is not a real preference. If a model is on disk, use it.
    const configured =
      saved?.modelId && saved.modelId !== 'apple-ondevice' ? saved.modelId : '';
    const chosen = configured || (found.length === 1 ? found[0] : '');
    if (!chosen) return false;
    if (chosen !== saved?.modelId) {
      // Adopted rather than configured: write it down so the save reflects the
      // model that is truly answering.
      useCreatureStore.getState().setModelId(chosen);
    }
    return restoreLoadedModel(chosen);
  })
  .catch((err) => {
    console.warn('[store] model restore failed:', err);
  });
