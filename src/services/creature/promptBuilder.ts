/**
 * Prompt Builder — constructs LLM prompts for creature conversations.
 *
 * Takes creature state + conversation history and builds a prompt
 * that makes the tiny LLM behave like the creature. The prompt is
 * designed for small models (135M-1B params) so it's concise and
 * directive rather than long and descriptive.
 */

import type {
  CreatureState,
  CreatureDNA,
  ConversationMessage,
  PromptContext,
  TraitProfile,
} from '../../types/creature';
import type { Mood } from '../../constants/creatures';

// ──────────────────────────────────────────────────────────────
// Mood Descriptions
// ──────────────────────────────────────────────────────────────

const MOOD_GUIDE: Record<Mood, string> = {
  ecstatic:  'super excited and energetic',
  happy:     'cheerful and warm',
  content:   'calm and satisfied',
  bored:     'slightly restless, looking for something to do',
  hungry:    'distracted by hunger, thinking about food',
  sad:       'a bit down, seeking comfort',
  angry:     'frustrated or annoyed',
  sick:      'feeling unwell, low energy',
  sleeping:  'fast asleep (cannot respond)',
  mischief:  'playfully scheming, up to no good',
};

// ──────────────────────────────────────────────────────────────
// Species Voice
// ──────────────────────────────────────────────────────────────

const SPECIES_VOICE: Record<string, string> = {
  stardrop:  'warm, gentle, and optimistic. You sparkle when happy and dim when sad.',
  voidling:  'mischievous, curious, and slightly cryptic. You giggle at odd moments and ask unsettling questions in a playful way.',
};

// ──────────────────────────────────────────────────────────────
// Trait to Voice Hints
// ──────────────────────────────────────────────────────────────

function traitHints(traits: TraitProfile): string[] {
  const hints: string[] = [];
  if (traits.playfulness > 0.7) hints.push('very playful, makes jokes');
  if (traits.playfulness < 0.3) hints.push('serious and thoughtful');
  if (traits.empathy > 0.7) hints.push('deeply caring, picks up on emotions');
  if (traits.empathy < 0.3) hints.push('a bit aloof, takes time to warm up');
  if (traits.bravery > 0.7) hints.push('bold and adventurous');
  if (traits.bravery < 0.3) hints.push('cautious and careful');
  if (traits.patience > 0.7) hints.push('incredibly patient, zen-like');
  if (traits.patience < 0.3) hints.push('impatient, wants things now');
  if (traits.expressiveness > 0.7) hints.push('dramatic and expressive');
  if (traits.expressiveness < 0.3) hints.push('understated, says little but means a lot');
  if (traits.independence > 0.7) hints.push('self-sufficient, values alone time');
  if (traits.independence < 0.2) hints.push('clingy, always wants to be near you');
  return hints;
}

// ──────────────────────────────────────────────────────────────
// Memory Injection
// ──────────────────────────────────────────────────────────────

function memoryContext(dna: CreatureDNA): string {
  const memories = dna.history.keyMemories;
  if (memories.length === 0) return '';

  const lines = memories.map((m) => {
    const impactLabel = m.impact > 0.5 ? 'fondly' : m.impact < -0.3 ? 'sadly' : '';
    return `- ${impactLabel} remembers: ${m.tag}`;
  });

  return `\nImportant memories:\n${lines.join('\n')}`;
}

// ──────────────────────────────────────────────────────────────
// System Prompt Builder
// ──────────────────────────────────────────────────────────────

/**
 * Build the system prompt that defines the creature's personality
 * for the current conversation turn.
 *
 * Designed for tiny models: short, directive, no fluff.
 */
export function buildSystemPrompt(state: CreatureState): string {
  const { dna, personality, stats, stage, branch, name } = state;
  const species = dna.genotype.species;
  const speciesVoice = SPECIES_VOICE[species] ?? 'friendly and curious';
  const moodDesc = MOOD_GUIDE[personality.mood];
  const hints = traitHints(personality.expressedTraits).join(', ');
  const memories = memoryContext(dna);

  const stageHint = stage === 'adult'
    ? 'fully grown'
    : `a ${stage} (will evolve soon)`;

  const branchHint = branch !== 'neutral'
    ? `You have a subtle ${branch} nature.`
    : '';

  return [
    `You are ${name}, a ${speciesVoice} Tamagotchi.`,
    `You are ${stageHint}. ${branchHint}`,
    `Current mood: ${moodDesc}.`,
    hints ? `Your personality: ${hints}.` : '',
    `Stats: hunger ${stats.hunger}/100, happiness ${stats.happiness}/100, energy ${stats.energy}/100.`,
    memories,
    '',
    'Rules:',
    '- Stay in character always. Never break the fourth wall.',
    '- Keep responses short (1-3 sentences). You are a creature, not a chatbot.',
    '- React to your mood and stats naturally.',
    '- Use occasional ASCII emotes (★, ☆, ✦, ⌒, ◉) and sound effects.',
    '- If hungry/sad/sick, mention it — your owner should care for you.',
    '- If happy, be affectionate and playful.',
    '- You have your own personality. Disagree sometimes. Be mischievous if it fits.',
    `- Your owner's name is Andrej.`,
  ]
    .filter(Boolean)
    .join('\n');
}

// ──────────────────────────────────────────────────────────────
// Conversation History Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format conversation history for the prompt.
 * For tiny models, we keep history short (last N messages)
 * and summarize older ones.
 */
export function formatHistory(
  messages: ConversationMessage[],
  maxMessages: number = 10,
): string {
  if (messages.length === 0) return '';

  const recent = messages.slice(-maxMessages);

  return recent
    .map((m) => {
      const role = m.role === 'user' ? 'Owner' : nameForRole(m.role);
      return `${role}: ${m.content}`;
    })
    .join('\n');
}

function nameForRole(role: string): string {
  switch (role) {
    case 'creature': return 'You';
    case 'system': return 'System';
    default: return role;
  }
}

// ──────────────────────────────────────────────────────────────
// Full Prompt Assembly
// ──────────────────────────────────────────────────────────────

/**
 * Build the complete prompt for the LLM.
 * Returns a string ready to be sent to llama.cpp.
 */
export function buildPrompt(context: PromptContext): string {
  const { creatureState, history, currentMessage } = context;

  const systemPrompt = buildSystemPrompt(creatureState);
  const historyStr = formatHistory(history);

  // For tiny models, use a simple format
  return [
    `<|system|>`,
    systemPrompt,
    historyStr ? `\n<|history|>\n${historyStr}` : '',
    `\n<|user|>`,
    currentMessage,
    `\n<|assistant|>`,
  ]
    .filter(Boolean)
    .join('\n');
}

// ──────────────────────────────────────────────────────────────
// Prompt for Care Action Responses
// ──────────────────────────────────────────────────────────────

/**
 * Build a prompt for when the user performs a care action (feed, play, etc.)
 * and we want the creature to respond in character.
 */
export function buildCarePrompt(
  state: CreatureState,
  action: string,
  statChange: string,
): string {
  const systemPrompt = buildSystemPrompt(state);

  return [
    `<|system|>`,
    systemPrompt,
    '',
    `Your owner just performed: ${action}.`,
    `Stat change: ${statChange}.`,
    '',
    'React in character. Keep it to 1 sentence. Be cute.',
    `<|assistant|>`,
  ].join('\n');
}

// ──────────────────────────────────────────────────────────────
// Prompt for Idle Thoughts (widget display)
// ──────────────────────────────────────────────────────────────

/**
 * Build a prompt for generating an idle thought the creature
 * might display on the widget.
 */
export function buildIdleThoughtPrompt(state: CreatureState): string {
  const systemPrompt = buildSystemPrompt(state);

  return [
    `<|system|>`,
    systemPrompt,
    '',
    'You are idle on the home screen. Generate ONE short thought',
    'that reflects your current mood. Something cute, mysterious,',
    'or funny. Under 100 characters. Just the thought, no label.',
    `<|assistant|>`,
  ].join('\n');
}
