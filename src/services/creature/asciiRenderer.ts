/**
 * ASCII Renderer — Produces the final creature display string.
 *
 * Combines species base art, evolution stage, mood expression, and
 * evolution branch cues into a single rendered string ready for
 * widget or app display.
 *
 * Pure function. No side effects. Deterministic given the same inputs.
 */

import type { Species, EvolutionStage, EvolutionBranch, Mood, CreatureArt } from '../../constants/creatures';
import { CREATURES } from '../../constants/creatures';
import type { CreatureState, TraitProfile } from '../../types/creature';

// ──────────────────────────────────────────────────────────────
// Mood Data Shapes (per species)
// ──────────────────────────────────────────────────────────────

interface StardropMoodData {
  eyes: string;
  mouth: string;
  cheeks: string;
}

interface VoidlingMoodData {
  eyes: string;
  mouth: string;
}

type MoodData = StardropMoodData | VoidlingMoodData;

// ──────────────────────────────────────────────────────────────
// Default Eyes by Stage (used as search targets)
// ──────────────────────────────────────────────────────────────

const DEFAULT_EYES_STARDROP: Record<EvolutionStage, string> = {
  egg:  '',       // egg has no eyes
  baby: '◉◉',
  child: '◉  ◉',
  teen:  '◉  ◉',
  adult: '◉   ◉',
};

const DEFAULT_EYES_VOIDLING: Record<EvolutionStage, string> = {
  egg:  '◉◉',
  baby: '◉◉',
  child: '◉◉',
  teen:  '◉  ◉',
  adult: '◉  ◉',
};

const DEFAULT_MOUTHS: Record<EvolutionStage, string> = {
  egg:  '',
  baby: '⌣',
  child: '⌣',
  teen:  '◡',
  adult: '◡',
};

// ──────────────────────────────────────────────────────────────
// Branch Modifiers
// ──────────────────────────────────────────────────────────────

interface BranchModifier {
  /** Replacement for the top line (e.g., add halo) */
  topLine?: string;
  /** Prepend this line before the art (e.g., voidling halo) */
  prepend?: string;
  /** Suffix to append (e.g., zZz for sleeping) */
  suffix?: string;
}

function getBranchModifier(
  species: Species,
  branch: EvolutionBranch,
  stage: EvolutionStage,
): BranchModifier {
  if (branch === 'neutral') return {};

  // Must be at least teen for branch cues to show
  if (stage === 'egg' || stage === 'baby' || stage === 'child') return {};

  const modifiers: Record<Exclude<EvolutionBranch, 'neutral'>, Record<Species, BranchModifier>> = {
    angel: {
      stardrop: { topLine: '╭─ ○ ★ ★ ─────╮' },   // Adult: tiny halo
      voidling: { prepend: '  ○' },                 // halo above
    },
    trickster: {
      stardrop: {},                                   // asymmetric eye handled by mood override if applicable
      voidling: {},                                   // winking eye via mood
    },
    gremlin: {
      stardrop: { topLine: '╭─ ▲ ★ ▲ ─────╮' },    // horn nubs on top line
      voidling: { prepend: ' ▲▲' },                  // horns above
    },
    sage: {
      stardrop: { topLine: '╭─ ★ · ★ ─────╮' },    // wisdom dot
      voidling: { prepend: '  ·' },                   // wisdom mark above
    },
  };

  return modifiers[branch]?.[species] ?? {};
}

// ──────────────────────────────────────────────────────────────
// Main Render Function
// ──────────────────────────────────────────────────────────────

/**
 * Render a creature's full ASCII art given its complete state.
 *
 * @param state - The creature's current state
 * @param showZzz - Whether to show the zZz indicator for sleeping creatures
 * @returns The full ASCII art string for display
 */
export function renderCreature(state: CreatureState, showZzz: boolean = true): string {
  const { dna, stage, branch, personality, isSleeping } = state;
  const species = dna.genotype.species;
  const mood = isSleeping ? 'sleeping' : personality.mood;

  const art = CREATURES[species];
  let result = art.stages[stage];

  // ── Apply Branch Cues ──────────────────────────────
  const branchMod = getBranchModifier(species, branch, stage);

  if (branchMod.topLine) {
    const lines = result.split('\n');
    lines[0] = branchMod.topLine;
    result = lines.join('\n');
  }

  if (branchMod.prepend) {
    result = branchMod.prepend + '\n' + result;
  }

  // ── Apply Mood Expression ──────────────────────────
  const moodData = art.moods[mood] as unknown as MoodData;

  if (moodData && stage !== 'egg') {
    const lines = result.split('\n');
    const defaultEyes = species === 'voidling'
      ? DEFAULT_EYES_VOIDLING[stage]
      : DEFAULT_EYES_STARDROP[stage];

    // Find the eyes line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (defaultEyes && line.includes(defaultEyes)) {
        // Replace eyes
        lines[i] = line.replace(defaultEyes, moodData.eyes);
        break;
      }
    }

    // Find the mouth line (typically the line after eyes)
    const defaultMouth = DEFAULT_MOUTHS[stage];
    if (defaultMouth) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.includes(defaultMouth)) {
          lines[i] = line.replace(defaultMouth, moodData.mouth);
          break;
        }
      }
    }

    // Apply cheeks for stardrop
    if (species === 'stardrop' && 'cheeks' in moodData) {
      const stardropData = moodData as StardropMoodData;
      if (stardropData.cheeks) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          if (line.includes('░') || line.includes('▓') || line.includes('█') || line.includes(' ')) {
            // Find the cheeks line — it's the one with repeated block/space chars after the mouth
            const cheekMatch = line.match(/[░▓█ ]{5,}/);
            if (cheekMatch) {
              // Only replace if it's NOT the bottom border (which also has repeated chars)
              if (!line.includes('╰') && !line.includes('╯')) {
                const start = cheekMatch.index!;
                const before = line.substring(0, start);
                const paddedCheeks = padCenter(stardropData.cheeks, cheekMatch[0].length);
                lines[i] = before + paddedCheeks;
                break;
              }
            }
          }
        }
      }
    }

    result = lines.join('\n');
  }

  // ── Apply Sleep Indicator ──────────────────────────
  if (showZzz && mood === 'sleeping' && stage !== 'egg') {
    result += '  zZz';
  }

  return result;
}

/**
 * Render just the face (top portion) — for compact widget display.
 */
export function renderCreatureFace(state: CreatureState): string {
  const full = renderCreature(state, false);
  const lines = full.split('\n');

  // Return top portion: roughly top half for face-only display
  const faceLines = Math.min(4, Math.ceil(lines.length / 2));
  return lines.slice(0, faceLines).join('\n');
}

// ──────────────────────────────────────────────────────────────
// Stat Bar Renderer (for large widgets)
// ──────────────────────────────────────────────────────────────

/**
 * Render a horizontal stat bar using block characters.
 * Example: "Hunger  ●───────○  15%"
 */
export function renderStatBar(label: string, value: number, max: number = 100): string {
  const pct = clamp(value / max, 0, 1);
  const barWidth = 10;
  const filled = Math.round(pct * barWidth);
  const empty = barWidth - filled;

  const bar = '●' + '─'.repeat(Math.max(0, filled - 2)) + '○' + '─'.repeat(Math.max(0, empty - 1));
  const displayPct = Math.round(pct * 100);

  return `${label.padEnd(8)} ${bar} ${displayPct}%`;
}

// ──────────────────────────────────────────────────────────────
// Trait Descriptions (for DNA display / info screen)
// ──────────────────────────────────────────────────────────────

export function describeTrait(name: string, value: number): string {
  if (value > 0.8) return `Very ${name}`;
  if (value > 0.6) return `Quite ${name}`;
  if (value > 0.4) return `Moderately ${name}`;
  if (value > 0.2) return `Slightly ${name}`;
  return `Not very ${name}`;
}

export function describeTraits(traits: TraitProfile): string[] {
  return Object.entries(traits).map(([name, value]) => describeTrait(name, value));
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function padCenter(str: string, width: number): string {
  if (str.length >= width) return str;
  const left = Math.floor((width - str.length) / 2);
  const right = width - str.length - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}
