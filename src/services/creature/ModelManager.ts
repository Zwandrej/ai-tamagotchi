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
  const stage = creature.stage;
  const traits = creature.dna.phenotype.expressedTraits;
  const species = creature.dna.genotype.species;

  // ── State-driven urgent responses (take priority) ──
  if (stats.hunger > 90) {
    if (stage === 'egg' || stage === 'baby') return `food... please...`;
    if (stage === 'child' || stage === 'teen') return `I'm really hungry... can I eat?`;
    return `I could really use some food right now.`;
  }
  if (stats.energy < 10) {
    if (stage === 'egg' || stage === 'baby') return `so... sleepy...`;
    if (stage === 'child' || stage === 'teen') return `Can I sleep now? So tired...`;
    return `I can barely keep my eyes open. Need rest.`;
  }
  if (stats.hygiene < 15) {
    if (stage === 'egg' || stage === 'baby') return `icky...`;
    if (stage === 'child' || stage === 'teen') return `I don't feel clean...`;
    return `I could really use a bath.`;
  }
  if (mood === 'sick') {
    if (stage === 'egg' || stage === 'baby') return `owie...`;
    if (stage === 'child' || stage === 'teen') return `don't feel good...`;
    return `I'm not feeling well.`;
  }

  // ── Mood-prefixed responses (no asterisks, natural language) ──
  const moodText: Record<string, string[]> = {
    ecstatic: ['So happy!', 'Best day!', 'Everything is amazing!'],
    happy: ['Nice!', 'Feeling good!', 'What a lovely moment.'],
    content: ['All good here.', 'Just vibing.', 'Peaceful day.'],
    bored: ['Hmm.', 'Not much happening.', 'What should we do?'],
    hungry: ['Getting hungry...', 'Snack time maybe?', 'Tummy is rumbling.'],
    sad: ['Feeling down...', 'A bit gloomy.', 'Could use a hug.'],
    angry: ['Not happy.', 'That was mean.', 'I need space.'],
  };
  const prefix = (moodText[mood] || ['Hello?'])[Math.floor(Math.random() * 3)] || 'Hmm.';

  // ── Context-aware responses (no percentages, stage-aware) ──
  const isBaby = stage === 'egg' || stage === 'baby';
  const isYoung = stage === 'child' || stage === 'teen';

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return isBaby ? `${prefix} Hi hi!` : isYoung ? `${prefix} Hey, I'm ${name}!` : `${prefix} Hello! I'm ${name}, a ${species}.`;
  }

  if (lower.includes('how are you') || lower.includes('how do you feel')) {
    return isBaby ? `${prefix} Me feel ${mood}!` : isYoung ? `${prefix} I feel ${mood} today.` : `${prefix} I'm ${mood}. Thanks for asking.`;
  }

  if (lower.includes('love') || lower.includes('like you') || lower.includes('cute')) {
    return isBaby ? `You nice! Happy!` : isYoung ? `${prefix} That makes me smile!` : `${prefix} That means a lot.`;
  }

  if (lower.includes('food') || lower.includes('hungry') || lower.includes('eat')) {
    if (isBaby) return stats.hunger > 50 ? `Me hungry!` : `Tummy ok.`;
    if (isYoung) return stats.hunger > 50 ? `Yeah, I could eat!` : `I'm okay for now.`;
    return stats.hunger > 50 ? `Actually, I am getting hungry.` : `I'm fine, but thanks!`;
  }

  if (lower.includes('play') || lower.includes('fun') || lower.includes('game')) {
    return isBaby ? `Play play play!` : isYoung ? `Yes, let's play!` : `Let's do something fun!`;
  }

  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('bed')) {
    if (stats.energy < 30) {
      return isBaby ? `night night...` : isYoung ? `Yeah... sleepy...` : `I think I need to rest.`;
    }
    return isBaby ? `No sleepy!` : isYoung ? `Maybe later?` : `I'm still awake.`;
  }

  // ── Generic responses (stage-aware, no asterisks) ──
  if (isBaby) {
    const baby = ['Hi hi!', 'You nice!', 'Me happy!', 'What that?', 'Play?', 'Warm...', 'Love you!'];
    return prefix + ' ' + baby[Math.floor(Math.random() * baby.length)];
  }
  if (isYoung) {
    const young = [`${name} is here!`, `What's up?`, `Cool!`, `Tell me something.`, `This is fun.`, `I like you.`];
    return prefix + ' ' + young[Math.floor(Math.random() * young.length)];
  }
  const adult = [`${name} is listening.`, `What's on your mind?`, `Tell me more.`, `I wonder what's next.`, `Being a ${species} is interesting.`, `Sometimes quiet is nice.`];
  return prefix + ' ' + adult[Math.floor(Math.random() * adult.length)];;
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

  const { hunger, happiness, energy, hygiene } = creature.stats;

  // Build state-driven behavior hints — the creature acts on its needs
  const stateHints: string[] = ['YOUR CURRENT STATE (act on this):'];
  if (hunger > 80) stateHints.push('⚠️ You are VERY hungry. You should mention wanting food. Your stomach growls.');
  else if (hunger > 50) stateHints.push('You are getting hungry. You might mention snacks.');
  else stateHints.push('You are well-fed and comfortable.');

  if (energy < 20) stateHints.push('⚠️ You are EXHAUSTED. Act drowsy, yawn, speak slowly. You need sleep.');
  else if (energy < 40) stateHints.push('You are getting tired. You might mention being sleepy.');

  if (happiness < 30) stateHints.push('⚠️ You are UNHAPPY. You need comfort. Act needy, sad, or ask for attention.');
  else if (happiness > 80) stateHints.push('You are very happy and cheerful!');

  if (hygiene < 30) stateHints.push('⚠️ You feel DIRTY. You want to be cleaned.');
  if (creature.isSleeping) stateHints.push('💤 You are ASLEEP. Do not respond unless woken up.');

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
    stateHints.join('\n'),
    '',
    'RULES:',
    '- You are the creature. ONLY write YOUR dialogue. NEVER write what the Human says.',
    '- Never write "Human:" followed by text. That is NOT your role.',
    '- Stay in character always.',
    '- Keep responses short (1-3 sentences).',
    '- Show emotion through words and tone, not *asterisk actions*.',
    `- The Human is Andrej.`,
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
