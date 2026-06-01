/**
 * Integration Tests — New modules (conversation, notifications, renderer, species, models)
 */

import { createCreature, performCare, ageCreature } from '../src/services/creature/creatureEngine';
import { renderCreature, renderStatBar, describeTrait } from '../src/services/creature/asciiRenderer';
import {
  createConversation,
  addMessage,
  getPromptContext,
  getRecentMessages,
  estimateTokenCount,
} from '../src/services/conversation/conversationManager';
import {
  checkNotifications,
  getAllActiveNotifications,
  getInteractionHint,
  resetCooldowns,
} from '../src/services/notifications/notificationEngine';
import {
  getSpeciesConfig,
  getStageInfo,
  getNextStage,
  getBranchInfo,
} from '../src/constants/species';
import {
  MODEL_CATALOG,
  getModelById,
  getDefaultModel,
  getModelsByRamBudget,
  formatModelSize,
} from '../src/constants/models';

// ══════════════════════════════════════════════════════════════
// ASCII Renderer
// ══════════════════════════════════════════════════════════════

describe('ASCII Renderer', () => {
  it('renders a stardrop egg', () => {
    const creature = createCreature('stardrop', 'Pixel');
    const result = renderCreature(creature);
    expect(result).toBeTruthy();
    expect(result).toContain('★');
  });

  it('renders a voidling', () => {
    const creature = createCreature('voidling', 'Shade');
    const result = renderCreature(creature);
    expect(result).toBeTruthy();
    expect(result).toContain('▓');
  });

  it('shows different moods', () => {
    const creature = createCreature('stardrop', 'Pixel');
    const adult = ageCreature(creature, 24 * 20); // age to adult
    const happy = renderCreature(adult);
    expect(happy).toBeTruthy();

    // Make it sad and check it's different
    adult.stats.happiness = 10;
    adult.personality.mood = 'sad';
    const sad = renderCreature(adult);
    expect(sad).not.toBe(happy);
  });

  it('renders stat bars', () => {
    const bar = renderStatBar('Hunger', 50);
    expect(bar).toContain('Hunger');
    expect(bar).toContain('50%');
    expect(bar).toContain('●');
    expect(bar).toContain('○');
  });

  it('describes trait values', () => {
    expect(describeTrait('playful', 0.9)).toBe('Very playful');
    expect(describeTrait('playful', 0.5)).toBe('Moderately playful');
    expect(describeTrait('playful', 0.1)).toBe('Not very playful');
  });
});

// ══════════════════════════════════════════════════════════════
// Conversation Manager
// ══════════════════════════════════════════════════════════════

describe('Conversation Manager', () => {
  it('creates an empty conversation', () => {
    const conv = createConversation();
    expect(conv.messages).toEqual([]);
    expect(conv.totalMessages).toBe(0);
  });

  it('adds messages', () => {
    let conv = createConversation();
    conv = addMessage(conv, 'user', 'Hello!');
    expect(conv.messages.length).toBe(1);
    expect(conv.totalMessages).toBe(1);
    expect(conv.messages[0]!.role).toBe('user');
  });

  it('trims old messages', () => {
    let conv = createConversation();
    for (let i = 0; i < 15; i++) {
      conv = addMessage(conv, 'user', `Message ${i}`);
    }
    // Should keep only the last 10
    expect(conv.messages.length).toBeLessThanOrEqual(10);
    expect(conv.totalMessages).toBe(15);
  });

  it('generates prompt context', () => {
    let conv = createConversation();
    conv = addMessage(conv, 'user', 'Hi there!');
    conv = addMessage(conv, 'creature', '★ Hello! ★');
    const ctx = getPromptContext(conv);
    expect(ctx).toContain('Hi there!');
    expect(ctx).toContain('Hello!');
  });

  it('gets recent messages', () => {
    let conv = createConversation();
    conv = addMessage(conv, 'user', 'One');
    conv = addMessage(conv, 'creature', 'Two');
    conv = addMessage(conv, 'user', 'Three');
    const recent = getRecentMessages(conv, 2);
    expect(recent.length).toBe(2);
    expect(recent[0]!.content).toBe('Two');
    expect(recent[1]!.content).toBe('Three');
  });

  it('estimates token count', () => {
    let conv = createConversation();
    conv = addMessage(conv, 'user', 'Hello world! This is a test message.');
    const tokens = estimateTokenCount(conv);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(50); // short message
  });
});

// ══════════════════════════════════════════════════════════════
// Notification Engine
// ══════════════════════════════════════════════════════════════

describe('Notification Engine', () => {
  beforeEach(() => {
    resetCooldowns();
  });

  it('notifies for critical hunger', () => {
    const creature = createCreature('stardrop', 'Pixel');
    creature.stats.hunger = 90;
    const notification = checkNotifications(creature);
    expect(notification).toBeTruthy();
    expect(notification!.urgency).toBe('high');
  });

  it('does not notify healthy creature', () => {
    const creature = createCreature('stardrop', 'Pixel');
    // Just created = healthy stats
    const notification = checkNotifications(creature);
    expect(notification).toBeNull();
  });

  it('returns all active notifications', () => {
    const creature = createCreature('stardrop', 'Pixel');
    creature.stats.hunger = 90;
    creature.stats.hygiene = 20;
    const all = getAllActiveNotifications(creature);
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('gets interaction hints', () => {
    const creature = createCreature('stardrop', 'Pixel');
    creature.stats.hunger = 90;
    const hint = getInteractionHint(creature);
    expect(hint).toBeTruthy();
    expect(hint).toContain('Feed');
  });

  it('respects cooldowns', () => {
    const creature = createCreature('stardrop', 'Pixel');
    creature.stats.hunger = 90;

    // First call should fire
    const first = checkNotifications(creature);
    expect(first).toBeTruthy();

    // Second call immediately should not fire (cooldown)
    const second = checkNotifications(creature);
    expect(second).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// Species Config
// ══════════════════════════════════════════════════════════════

describe('Species Config', () => {
  it('returns config for both species', () => {
    const stardrop = getSpeciesConfig('stardrop');
    expect(stardrop.name).toBe('Stardrop');
    expect(stardrop.emoji).toBe('⭐');

    const voidling = getSpeciesConfig('voidling');
    expect(voidling.name).toBe('Voidling');
    expect(voidling.voice).toContain('mischievous');
  });

  it('returns stage info', () => {
    const egg = getStageInfo('egg');
    expect(egg.durationHours).toBe(12);
    expect(egg.canEvolve).toBe(true);

    const adult = getStageInfo('adult');
    expect(adult.canEvolve).toBe(false);
  });

  it('determines next stage', () => {
    expect(getNextStage('egg')).toBe('baby');
    expect(getNextStage('baby')).toBe('child');
    expect(getNextStage('adult')).toBeNull();
  });

  it('returns branch info', () => {
    const angel = getBranchInfo('angel');
    expect(angel.name).toBe('Angel');
    expect(angel.cue).toContain('halo');

    const unknown = getBranchInfo('nonexistent');
    expect(unknown.name).toBe('Neutral'); // fallback
  });
});

// ══════════════════════════════════════════════════════════════
// Model Catalog
// ══════════════════════════════════════════════════════════════

describe('Model Catalog', () => {
  it('has models in the catalog', () => {
    expect(MODEL_CATALOG.length).toBeGreaterThan(0);
  });

  it('returns the default model', () => {
    const defaultModel = getDefaultModel();
    expect(defaultModel.id).toContain('360m');
  });

  it('finds model by ID', () => {
    const model = getModelById('smollm2-135m-q4km');
    expect(model).toBeTruthy();
    expect(model!.sizeMb).toBe(90);
  });

  it('filters by RAM budget', () => {
    const cheap = getModelsByRamBudget(300);
    expect(cheap.length).toBe(1); // only 135M fits in 300MB

    const moderate = getModelsByRamBudget(1000);
    expect(moderate.length).toBeGreaterThanOrEqual(3);
  });

  it('formats model size', () => {
    expect(formatModelSize(90)).toBe('90 MB');
    expect(formatModelSize(1400)).toBe('1.4 GB');
  });

  it('all models have required fields', () => {
    for (const model of MODEL_CATALOG) {
      expect(model.id).toBeTruthy();
      expect(model.name).toBeTruthy();
      expect(model.sizeMb).toBeGreaterThan(0);
      expect(model.minRamMb).toBeGreaterThan(0);
      expect(model.url).toBeTruthy();
      expect(model.recommendedConfig).toBeTruthy();
    }
  });
});

// ══════════════════════════════════════════════════════════════
// End-to-End: Full Lifecycle
// ══════════════════════════════════════════════════════════════

describe('Creature Lifecycle Integration', () => {
  it('full life: create → care → age → evolve → mood changes', () => {
    // Create
    const creature = createCreature('stardrop', 'Pixel');
    expect(creature.stage).toBe('egg');
    expect(creature.personality.mood).toBe('content');

    // Feed a few times
    let state = creature;
    for (let i = 0; i < 3; i++) {
      const result = performCare(state, 'feed');
      state = result.state;
    }
    expect(state.totalInteractions).toBe(3);

    // Age to baby
    state = ageCreature(state, 13);
    expect(state.stage).toBe('baby');

    // Age to adult
    state = ageCreature(state, 24 * 19); // ~19 more days
    expect(state.stage).toBe('adult');

    // Adult should be renderable
    const art = renderCreature(state);
    expect(art.length).toBeGreaterThan(0);

    // State should have evolved
    expect(state.totalInteractions).toBeGreaterThan(0);
    expect(state.dna.history.totalDaysAlive).toBeGreaterThan(0);
  });

  it('neglected creature becomes sad', () => {
    const creature = createCreature('stardrop', 'Pixel');
    // Age 20 hours without any care
    const neglected = ageCreature(creature, 20);
    expect(neglected.stats.happiness).toBeLessThan(80);
    expect(neglected.stats.hunger).toBeGreaterThan(20);
  });

  it('well-cared creature stays happy', () => {
    let creature = createCreature('stardrop', 'Pixel');
    // Play with it then age it
    const played = performCare(creature, 'play');
    expect(played.state.personality.mood).toBe('ecstatic');

    // Age a little
    const aged = ageCreature(played.state, 2);
    expect(aged.stats.happiness).toBeGreaterThan(50);
  });
});
