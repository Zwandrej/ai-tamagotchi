/**
 * Creature Engine Tests
 *
 * Tests for the core state machine, DNA system, and prompt builder.
 */

import {
  createCreature,
  restoreCreature,
  performCare,
  ageCreature,
  processConversationTurn,
} from '../src/services/creature/creatureEngine';

import {
  generateDNA,
  exportDNA,
  importDNA,
  validateDNA,
  expressTraits,
  nudgeTraits,
  addMemory,
  DNAValidationError,
} from '../src/services/creature/dna';

import {
  buildSystemPrompt,
  buildPrompt,
} from '../src/services/creature/promptBuilder';

import { makeCreatureStore } from '../src/store/creatureStore';

// ══════════════════════════════════════════════════════════════
// DNA System Tests
// ══════════════════════════════════════════════════════════════

describe('DNA System', () => {
  describe('generateDNA', () => {
    it('creates valid DNA for stardrop', () => {
      const dna = generateDNA('stardrop', 'Pixel');
      expect(dna.version).toBe('1.0');
      expect(dna.genotype.species).toBe('stardrop');
      expect(dna.phenotype.name).toBe('Pixel');
      expect(dna.phenotype.stage).toBe('egg');
      expect(dna.phenotype.branch).toBe('neutral');
      expect(dna.breeding.generation).toBe(0);
      expect(dna.breeding.parentIds).toEqual([]);
      expect(dna.id).toBeTruthy();
      expect(dna.id.length).toBeGreaterThan(0);
    });

    it('creates valid DNA for voidling', () => {
      const dna = generateDNA('voidling', 'Shade');
      expect(dna.genotype.species).toBe('voidling');
      expect(dna.phenotype.name).toBe('Shade');
    });

    it('is deterministic with same seed', () => {
      const dna1 = generateDNA('stardrop', 'Pixel', 42);
      const dna2 = generateDNA('stardrop', 'Pixel', 42);
      expect(dna1.genotype.seed).toBe(dna2.genotype.seed);
      expect(dna1.genotype.baseStats).toEqual(dna2.genotype.baseStats);
      expect(dna1.genotype.traitAlleles).toEqual(dna2.genotype.traitAlleles);
    });

    it('produces different DNA with different seeds', () => {
      const dna1 = generateDNA('stardrop', 'Pixel', 42);
      const dna2 = generateDNA('stardrop', 'Pixel', 99);
      expect(dna1.genotype.baseStats).not.toEqual(dna2.genotype.baseStats);
    });

    it('has stat values within 0-255 range', () => {
      const dna = generateDNA('stardrop', 'Pixel');
      const stats = dna.genotype.baseStats;
      for (const [key, val] of Object.entries(stats)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(255);
      }
    });

    it('has trait allele values within 0-1 range', () => {
      const dna = generateDNA('stardrop', 'Pixel');
      const alleles = dna.genotype.traitAlleles;
      for (const [, pair] of Object.entries(alleles)) {
        const allelePair = pair as { dominant: number; recessive: number };
        expect(allelePair.dominant).toBeGreaterThanOrEqual(0);
        expect(allelePair.dominant).toBeLessThanOrEqual(1);
        expect(allelePair.recessive).toBeGreaterThanOrEqual(0);
        expect(allelePair.recessive).toBeLessThanOrEqual(1);
        expect(allelePair.dominant).toBeGreaterThanOrEqual(allelePair.recessive);
      }
    });
  });

  describe('expressTraits', () => {
    it('expressed traits are within 0-1 range', () => {
      const dna = generateDNA('stardrop', 'Pixel');
      const traits = expressTraits(dna.genotype.traitAlleles);
      for (const [trait, val] of Object.entries(traits)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('expressed value is between dominant and recessive', () => {
      const dna = generateDNA('stardrop', 'Pixel');
      const alleles = dna.genotype.traitAlleles;
      const traits = expressTraits(alleles);

      for (const trait of Object.keys(traits) as Array<keyof typeof traits>) {
        const { dominant, recessive } = alleles[trait];
        expect(traits[trait]).toBeGreaterThanOrEqual(recessive * 0.9); // allow some float tolerance
        expect(traits[trait]).toBeLessThanOrEqual(dominant * 1.1);
      }
    });
  });

  describe('nudgeTraits', () => {
    it('increases trait with positive impact', () => {
      const traits = { playfulness: 0.5, empathy: 0.5, bravery: 0.5, patience: 0.5, expressiveness: 0.5, independence: 0.5 };
      const updated = nudgeTraits(traits, 'empathy', 1.0);
      expect(updated.empathy).toBeGreaterThan(0.5);
      expect(updated.playfulness).toBe(0.5); // unchanged
    });

    it('decreases trait with negative impact', () => {
      const traits = { playfulness: 0.5, empathy: 0.5, bravery: 0.5, patience: 0.5, expressiveness: 0.5, independence: 0.5 };
      const updated = nudgeTraits(traits, 'playfulness', -1.0);
      expect(updated.playfulness).toBeLessThan(0.5);
    });

    it('clamps at 0 and 1', () => {
      const traits = { playfulness: 0.99, empathy: 0.01, bravery: 0.5, patience: 0.5, expressiveness: 0.5, independence: 0.5 };
      const up = nudgeTraits(traits, 'playfulness', 1.0);
      const down = nudgeTraits(traits, 'empathy', -1.0);
      expect(up.playfulness).toBeLessThanOrEqual(1);
      expect(down.empathy).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addMemory', () => {
    it('adds a memory and keeps max 5', () => {
      let dna = generateDNA('stardrop', 'Pixel');
      for (let i = 0; i < 10; i++) {
        dna = addMemory(dna, `event_${i}`, 'Test event', i % 2 === 0 ? 0.5 : -0.5, 'empathy', 'content');
      }
      expect(dna.history.keyMemories.length).toBeLessThanOrEqual(5);
    });

    it('keeps highest impact memories', () => {
      let dna = generateDNA('stardrop', 'Pixel');
      dna = addMemory(dna, 'big_event', 'Big event happened', 1.0, 'bravery', 'happy');
      dna = addMemory(dna, 'small_event', 'Small event', 0.1, 'empathy', 'content');
      const tags = dna.history.keyMemories.map((m: { tag: string }) => m.tag);
      expect(tags).toContain('big_event');
    });
  });

  describe('exportDNA / importDNA', () => {
    it('round-trips DNA correctly', () => {
      const original = generateDNA('stardrop', 'Pixel', 42);
      const json = exportDNA(original);
      const restored = importDNA(json);
      expect(restored.genotype).toEqual(original.genotype);
      expect(restored.phenotype).toEqual(original.phenotype);
      expect(restored.breeding).toEqual(original.breeding);
    });

    it('rejects tampered DNA', () => {
      const dna = generateDNA('stardrop', 'Pixel');
      const tampered = { ...dna, version: '9.9' };
      expect(() => importDNA(JSON.stringify(tampered))).toThrow(DNAValidationError);
    });

    it('rejects invalid JSON', () => {
      expect(() => importDNA('not json')).toThrow(DNAValidationError);
    });
  });

  describe('validateDNA', () => {
    it('returns no errors for valid DNA', () => {
      const dna = generateDNA('stardrop', 'Pixel');
      const errors = validateDNA(dna);
      expect(errors).toEqual([]);
    });

    it('returns errors for missing genotype', () => {
      const errors = validateDNA({ version: '1.0', id: 'abc' });
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Creature Engine Tests
// ══════════════════════════════════════════════════════════════

describe('Creature Engine', () => {
  describe('createCreature', () => {
    it('creates a new creature in egg stage', () => {
      const creature = createCreature('stardrop', 'Pixel');
      expect(creature.name).toBe('Pixel');
      expect(creature.stage).toBe('egg');
      expect(creature.branch).toBe('neutral');
      expect(creature.isSleeping).toBe(false);
      expect(creature.totalInteractions).toBe(0);
    });

    it('initializes with healthy stats', () => {
      const creature = createCreature('stardrop', 'Pixel');
      expect(creature.stats.hunger).toBeLessThan(50);
      expect(creature.stats.happiness).toBeGreaterThan(50);
      expect(creature.stats.energy).toBeGreaterThan(50);
      expect(creature.personality.mood).toBe('content');
    });
  });

  describe('performCare', () => {
    let creature = createCreature('stardrop', 'Pixel');

    beforeEach(() => {
      creature = createCreature('stardrop', 'Pixel');
    });

    it('feed reduces hunger', () => {
      creature.stats.hunger = 80;
      const { state } = performCare(creature, 'feed');
      expect(state.stats.hunger).toBeLessThan(80);
    });

    it('play increases happiness, decreases energy', () => {
      const { state } = performCare(creature, 'play');
      expect(state.stats.happiness).toBeGreaterThan(creature.stats.happiness);
      expect(state.stats.energy).toBeLessThan(creature.stats.energy);
    });

    it('clean restores hygiene', () => {
      creature.stats.hygiene = 30;
      const { state } = performCare(creature, 'clean');
      expect(state.stats.hygiene).toBeGreaterThan(30);
    });

    it('tuck_in puts creature to sleep', () => {
      const { state } = performCare(creature, 'tuck_in');
      expect(state.isSleeping).toBe(true);
    });

    it('wake_up wakes creature and restores energy', () => {
      creature.isSleeping = true;
      creature.stats.energy = 20;
      const { state } = performCare(creature, 'wake_up');
      expect(state.isSleeping).toBe(false);
      expect(state.stats.energy).toBeGreaterThan(20);
    });

    it('returns a creature response', () => {
      const { result } = performCare(creature, 'play');
      expect(result.creatureResponse.length).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it('increments interaction counter', () => {
      const { state } = performCare(creature, 'feed');
      expect(state.totalInteractions).toBe(1);
    });
  });

  describe('ageCreature', () => {
    it('ages the creature over time', () => {
      const creature = createCreature('stardrop', 'Pixel');
      const aged = ageCreature(creature, 24); // 1 day
      expect(aged.age).toBeCloseTo(1, 0);
    });

    it('evolves from egg to baby after 12 hours', () => {
      const creature = createCreature('stardrop', 'Pixel');
      const aged = ageCreature(creature, 13);
      expect(aged.stage).toBe('baby');
    });

    it('increases hunger over time', () => {
      const creature = createCreature('stardrop', 'Pixel');
      creature.stats.hunger = 20;
      const aged = ageCreature(creature, 5);
      expect(aged.stats.hunger).toBeGreaterThan(20);
    });

    it('decreases happiness over time', () => {
      const creature = createCreature('stardrop', 'Pixel');
      creature.stats.happiness = 80;
      const aged = ageCreature(creature, 10);
      expect(aged.stats.happiness).toBeLessThan(80);
    });
  });

  describe('processConversationTurn', () => {
    it('updates happiness from positive response', () => {
      const creature = createCreature('stardrop', 'Pixel');
      const before = creature.stats.happiness;
      const updated = processConversationTurn(
        creature,
        'Hello!',
        '★ Yay! I love talking to you! You make me so happy! ★',
      );
      expect(updated.stats.happiness).toBeGreaterThan(before);
    });

    it('increments interaction counter', () => {
      const creature = createCreature('stardrop', 'Pixel');
      const updated = processConversationTurn(creature, 'Hi', 'Hello!');
      expect(updated.totalInteractions).toBe(1);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Prompt Builder Tests
// ══════════════════════════════════════════════════════════════

describe('Prompt Builder', () => {
  let creature = createCreature('stardrop', 'Pixel');

  beforeEach(() => {
    creature = createCreature('stardrop', 'Pixel');
  });

  describe('buildSystemPrompt', () => {
    it('includes creature name', () => {
      const prompt = buildSystemPrompt(creature);
      expect(prompt).toContain('Pixel');
    });

    it('includes species description', () => {
      const prompt = buildSystemPrompt(creature);
      expect(prompt).toContain('gentle');
      expect(prompt).toContain('sparkle');
    });

    it('includes mood', () => {
      const prompt = buildSystemPrompt(creature);
      expect(prompt).toContain('mood');
    });

    it('includes stage info', () => {
      const prompt = buildSystemPrompt(creature);
      expect(prompt).toContain('egg');
    });
  });

  describe('buildPrompt', () => {
    it('returns a non-empty string', () => {
      const prompt = buildPrompt({
        creatureState: creature,
        history: [],
        currentMessage: 'Hello!',
        systemPrompt: buildSystemPrompt(creature),
      });
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('includes the user message', () => {
      const prompt = buildPrompt({
        creatureState: creature,
        history: [],
        currentMessage: 'How are you?',
        systemPrompt: buildSystemPrompt(creature),
      });
      expect(prompt).toContain('How are you?');
    });

    it('includes conversation history when provided', () => {
      const prompt = buildPrompt({
        creatureState: creature,
        history: [
          { role: 'user', content: 'Hi there!', timestamp: new Date().toISOString() },
          { role: 'creature', content: '★ Hello! ★', timestamp: new Date().toISOString() },
        ],
        currentMessage: 'What\'s up?',
        systemPrompt: buildSystemPrompt(creature),
      });
      expect(prompt).toContain('Hi there!');
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Store Tests
// ══════════════════════════════════════════════════════════════

describe('Creature Store', () => {
  it('starts with no creature loaded', () => {
    const store = makeCreatureStore();
    expect(store.isLoaded).toBe(false);
    expect(store.creature).toBeNull();
  });

  it('creates a new creature', () => {
    const store = makeCreatureStore();
    store.create('stardrop', 'Pixel');
    expect(store.isLoaded).toBe(true);
    expect(store.creature!.name).toBe('Pixel');
  });

  it('performs care actions', () => {
    const store = makeCreatureStore();
    store.create('stardrop', 'Pixel');
    const result = store.care('feed');
    expect(result.success).toBe(true);
    expect(result.creatureResponse.length).toBeGreaterThan(0);
  });

  it('handles chat interactions', () => {
    const store = makeCreatureStore();
    store.create('stardrop', 'Pixel');
    const before = store.creature!.totalInteractions;
    store.chat('Hi!', '★ Hello, friend! ★');
    expect(store.creature!.totalInteractions).toBe(before + 1);
  });

  it('resets correctly', () => {
    const store = makeCreatureStore();
    store.create('stardrop', 'Pixel');
    store.reset();
    expect(store.isLoaded).toBe(false);
    expect(store.creature).toBeNull();
  });
});
