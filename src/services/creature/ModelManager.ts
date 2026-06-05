/**
 * ModelManager — Local LLM integration for creature conversation.
 *
 * Supports tiny GGUF models (under 1GB) that run on-device via llama.cpp.
 * Falls back to template-based responses when no model is loaded.
 *
 * Model catalog prioritizes models that run on mobile hardware.
 */

import type { CreatureState } from '../../types/creature';

// ──────────────────────────────────────────────────────────────
// Model Catalog
// ──────────────────────────────────────────────────────────────

export interface ModelInfo {
  id: string;
  name: string;
  size: string;      // e.g. "0.5 GB"
  minRAM: string;    // e.g. "2 GB"
  quant: string;     // e.g. "Q4_K_M"
  url: string;       // HuggingFace download URL
  description: string;
}

/** Curated list of models suitable for mobile — always available */
export const MODELS: ModelInfo[] = [
  {
    id: 'apple-ondevice',
    name: 'Apple On-Device',
    size: 'built-in',
    minRAM: 'N/A',
    quant: 'N/A',
    url: '',
    description: 'Uses iOS on-device ML. No download needed. Fastest, always available.',
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    size: '0.7 GB',
    minRAM: '2 GB',
    quant: 'Q4_K_M',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    description: 'Fastest. Good for quick responses on older devices.',
  },
  {
    id: 'tinyllama-1.1b',
    name: 'TinyLlama 1.1B',
    size: '0.6 GB',
    minRAM: '2 GB',
    quant: 'Q4_K_M',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    description: 'Very fast. Simple but charming responses.',
  },
  {
    id: 'phi-2',
    name: 'Phi-2 2.7B',
    size: '1.6 GB',
    minRAM: '4 GB',
    quant: 'Q4_K_M',
    url: 'https://huggingface.co/TheBloke/phi-2-GGUF/resolve/main/phi-2.Q4_K_M.gguf',
    description: 'Surprisingly smart for its size. Best quality.',
  },
  {
    id: 'gemma-2-2b',
    name: 'Gemma 2 2B',
    size: '1.4 GB',
    minRAM: '4 GB',
    quant: 'Q4_K_M',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    description: 'Google\'s tiny model. Creative and playful.',
  },
];

// ──────────────────────────────────────────────────────────────
// Model Manager State
// ──────────────────────────────────────────────────────────────

export interface ModelState {
  activeModelId: string | null;
  isLoaded: boolean;
  isLoading: boolean;
  downloadProgress: number; // 0-100
  error: string | null;
}

// ──────────────────────────────────────────────────────────────
// Template-based fallback (no model loaded)
// ──────────────────────────────────────────────────────────────

/**
 * Generate a creature response using simple templates.
 * This runs when no LLM model is loaded — the default state.
 */
export function generateTemplateResponse(
  creature: CreatureState,
  userMessage: string,
): string {
  const lower = userMessage.toLowerCase();
  const mood = creature.personality.mood;
  const name = creature.name;
  const stats = creature.stats;
  const traits = creature.dna.phenotype.expressedTraits;
  const species = creature.dna.genotype.species;

  // ── State-driven urgent responses (take priority) ──
  if (stats.hunger > 90) return `*stomach growls loudly* ${name} needs food! ;;`;
  if (stats.energy < 10) return `*barely keeping eyes open* so... tired...`;
  if (stats.hygiene < 15) return `*sniff sniff* um... ${name} could use a bath...`;
  if (mood === 'sick') return `*weak chirp* ${name} doesn't feel good... need help...`;

  // ── Mood-prefixed responses ──
  const moodPrefix: Record<string, string[]> = {
    ecstatic: ['*bouncing excitedly*', '*sparkling with joy*', '*radiating happiness*'],
    happy: ['*chirps cheerfully*', '*tail wagging*', '*bright-eyed*'],
    content: ['*nods peacefully*', '*gentle purr*', '*cozy sigh*'],
    bored: ['*yawns*', '*stares at ceiling*', '*fidgets*'],
    hungry: ['*stomach rumbles*', '*looks at food bowl*', '*pawing at you*'],
    sad: ['*droopy ears*', '*quiet sniffle*', '*looking down*'],
    angry: ['*steam from ears*', '*grumpy glare*', '*crosses arms*'],
  };
  const prefix = (moodPrefix[mood] || ['*tilts head*'])[Math.floor(Math.random() * 3)]!;

  // ── Context-aware responses based on user message ──
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey'))
    return `${prefix} Hi! I'm ${name} the ${species} ☆`;

  if (lower.includes('how are you') || lower.includes('how do you feel'))
    return `${prefix} I feel ${mood}. My hunger is ${stats.hunger}% and energy ${stats.energy}%.`;

  if (lower.includes('love') || lower.includes('like you') || lower.includes('cute'))
    return `${prefix} Aww! *blushes* That makes me so happy! ♡`;

  if (lower.includes('food') || lower.includes('hungry') || lower.includes('eat'))
    return stats.hunger > 50
      ? `${prefix} Yes please! I'm at ${stats.hunger}% hunger!`
      : `${prefix} I'm okay for now — ${stats.hunger}% hunger.`;

  if (lower.includes('play') || lower.includes('fun') || lower.includes('game'))
    return traits.playfulness > 0.6
      ? `${prefix} YES! Play time! Let's go! ☆`
      : `${prefix} Sure, we can play if you want.`;

  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('bed'))
    return `${prefix} ${stats.energy < 30 ? 'Zzz... yes please...' : 'I could rest... or stay up with you!'}`;

  if (lower.includes('story') || lower.includes('tell me'))
    return `${prefix} Once upon a time, a little ${species} dreamed of stars and adventure... ✦`;

  if (lower.includes('why') || lower.includes('what'))
    return `${prefix} That's a deep question! *ponders* The universe is full of mysteries...`;

  // ── Personality-driven generic responses ──
  const genericResponses = [
    `${prefix} ${name} is listening intently.`,
    `${prefix} ${name} chirps a little tune.`,
    `${prefix} ${name} tilts its head curiously.`,
    `${prefix} *happy wiggle* What's up?`,
    `${prefix} ${name} draws a little star in the air... ✦`,
    `${prefix} The world feels ${mood === 'happy' ? 'bright' : mood === 'sad' ? 'heavy' : 'interesting'} today.`,
    `${prefix} ${name} remembers all the good times with you.`,
  ];

  return genericResponses[Math.floor(Math.random() * genericResponses.length)]!;
}

// ──────────────────────────────────────────────────────────────
// LLM Prompt Builder (when model is loaded)
// ──────────────────────────────────────────────────────────────

/**
 * Build the system prompt — creature identity and voice.
 * Message assembly with proper role separation happens in AIService.
 */
export function buildLLMPrompt(
  creature: CreatureState,
  _conversationHistory: { role: string; content: string }[],
  _userMessage: string,
): string {
  return buildSystemPrompt(creature);
}

/** Build the system prompt that defines the creature's identity and voice */
export function buildSystemPrompt(creature: CreatureState): string {
  const species = creature.dna.genotype.species;
  const traits = creature.dna.phenotype.expressedTraits;
  const personality = creature.personality;

  const stageRules = creature.stage === 'egg'
    ? '🔴 YOU ARE AN EGG. You cannot speak in sentences. Respond with ONE word, a sound, or a feeling. Examples: "warm...", "☆", "...soon". NEVER write more than 2 words.'
    : creature.stage === 'baby'
    ? '🔴 YOU ARE A BABY. Use VERY short baby sentences (3-6 words). Baby talk, mispronunciations, simple emotions. Example: "Me happy! You nice!"'
    : creature.stage === 'child'
    ? '🔴 YOU ARE A CHILD. Use short sentences with simple words. Be curious, ask questions. Max 10 words per sentence.'
    : creature.stage === 'teen'
    ? '🔴 YOU ARE A TEENAGER. Growing confidence, occasional moodiness. You sometimes push back or act independent.'
    : 'You are an adult. Speak naturally with full sentences and personality.';

  return [
    `You are ${creature.name}, a ${species} creature.`,
    `Mood: ${personality.mood}. Traits: ${Object.entries(traits)
      .filter(([, v]) => (v as number) > 50)
      .map(([k]) => k)
      .join(', ') || 'balanced'}.`,
    species === 'stardrop'
      ? 'You are gentle, sparkly, and full of wonder.'
      : 'You are fluid, curious, and a little mysterious.',
    stageRules,
    '',
    'RULES:',
    '- You are the creature. ONLY write YOUR dialogue. NEVER write what the Human says.',
    '- Never write "Human:" followed by text. That is NOT your role.',
    '- Stay in character always.',
    '- Keep responses short (1-3 sentences).',
    '- Show emotion through words and tone, not *asterisk actions*.',
    `- The Human is Andrej.`,
    `Stats: hunger ${Math.round(creature.stats.hunger)}/100, happiness ${Math.round(creature.stats.happiness)}/100, energy ${Math.round(creature.stats.energy)}/100.`,
  ].join('\n');
}

// ──────────────────────────────────────────────────────────────
// Model Download / Load stubs (llama.cpp integration TBD)
// ──────────────────────────────────────────────────────────────

/**
 * Check if a model file exists locally.
 * Returns the path if found, null otherwise.
 */
export function findLocalModel(modelId: string): string | null {
  // Stub: llama.cpp native module integration needed
  // Would check ~/Documents/models/ or app bundle for .gguf files
  return null;
}

/**
 * Download a model from HuggingFace.
 * Returns progress as 0-100, or throws on error.
 * Requires llama.cpp native module for actual inference.
 */
export async function downloadModel(
  modelId: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  // Stub: would use react-native-fs to download
  // and validate checksum before returning path
  throw new Error(
    'Model download requires llama.cpp native module. ' +
    'Use template responses for now, or install llama.cpp integration.'
  );
}
