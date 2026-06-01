/**
 * Creature ASCII Art Constants
 *
 * All creature designs are defined here as template strings.
 * Each species has stages (egg → adult) and mood modifiers.
 * Evolution branches add subtle visual cues on top of the base design.
 *
 * Format: Multi-line strings with consistent width for monospace rendering.
 * All designs use Unicode box-drawing and block characters.
 */

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type Species = 'stardrop' | 'voidling';
export type EvolutionStage = 'egg' | 'baby' | 'child' | 'teen' | 'adult';
export type EvolutionBranch = 'neutral' | 'angel' | 'trickster' | 'gremlin' | 'sage';
export type Mood =
  | 'ecstatic'
  | 'happy'
  | 'content'
  | 'bored'
  | 'hungry'
  | 'sad'
  | 'angry'
  | 'sick'
  | 'sleeping'
  | 'mischief';

export interface CreatureArt {
  /** Base ASCII art per stage (no mood modifiers applied) */
  stages: Record<EvolutionStage, string>;
  /** Mood modifiers that get applied on top of the base art */
  moods: Record<Mood, string>;
  /** Branch cues applied on top of the base art */
  branches: Record<Exclude<EvolutionBranch, 'neutral'>, string>;
}

export interface MoodArt {
  stage: EvolutionStage;
  branch: EvolutionBranch;
  mood: Mood;
  ascii: string;
}

// ──────────────────────────────────────────────────────────────
// Stardrop (Pudding) — Soft, round, squishy
// ──────────────────────────────────────────────────────────────

const STARDROP_BASE: Record<EvolutionStage, string> = {
  egg: [
    '╭─★─╮',
    '│◉ ◉│',
    '╰───╯',
  ].join('\n'),

  baby: [
    '╭── ★ ──╮',
    '│  ◉◉   │',
    '│   ⌣   │',
    '╰───┬───╯',
    '    ││',
  ].join('\n'),

  child: [
    '╭─── ★★ ───╮',
    '│   ◉  ◉   │',
    '│    ⌣    │',
    '│  ░░░░░  │',
    '╰────┬┬───╯',
    '     ││ ││',
  ].join('\n'),

  teen: [
    '╭──── ★★ ────╮',
    '│    ◉  ◉    │',
    '│      ◡     │',
    '│   ░░░░░░   │',
    '╰─────┬┬─────╯',
    '      ││  ││',
  ].join('\n'),

  adult: [
    '╭───── ★ ★ ─────╮',
    '│     ◉   ◉     │',
    '│       ◡       │',
    '│    ░░░░░░░    │',
    '╰──────┬┬───────╯',
    '       ││   ││',
  ].join('\n'),
};

/**
 * Mood modifiers for Stardrop (applied to the face area of the adult design).
 * The renderer overlays these on the appropriate lines of the base art.
 */
const STARDROP_MOODS: Record<Mood, { eyes: string; mouth: string; cheeks: string }> = {
  happy:    { eyes: '◉   ◉', mouth: '  ◡  ', cheeks: '░░░░░░░' },
  ecstatic: { eyes: '★   ★', mouth: '  ▽  ', cheeks: '███████' },
  content:  { eyes: '◉   ◉', mouth: '  ~  ', cheeks: '       ' },
  bored:    { eyes: '◉   ◉', mouth: '  ·  ', cheeks: '       ' },
  hungry:   { eyes: '◉   ◉', mouth: '  ○  ', cheeks: '       ' },
  sad:      { eyes: '◡   ◡', mouth: '  ⌒  ', cheeks: '░░░░░░░' },
  angry:    { eyes: '>   <', mouth: '  ▽  ', cheeks: '▓▓▓▓▓▓▓' },
  sick:     { eyes: '×   ×', mouth: '  ~  ', cheeks: '       ' },
  sleeping: { eyes: '~   ~', mouth: '  ◡  ', cheeks: '░░░░░░░' },
  mischief: { eyes: '◉   •', mouth: '  ╰  ', cheeks: ' ░░ ░░ ' },
};

/**
 * Branch cues for Stardrop — tiny ASCII modifications.
 * Each cue replaces specific characters in the base art.
 */
const STARDROP_BRANCHES: Record<Exclude<EvolutionBranch, 'neutral'>, { topLine: string }> = {
  angel:    { topLine: '╭─ ○ ★ ★ ─╮' },  // tiny halo
  trickster: { topLine: '╭─ ★ ★ ─╮' },   // asymmetric eye handled at render time
  gremlin:  { topLine: '╭─ ▲ ★ ▲ ─╮' },  // horn nubs
  sage:     { topLine: '╭─ ★ · ★ ─╮' },  // wisdom dot
};

// ──────────────────────────────────────────────────────────────
// Voidling (Ink) — Fluid, drippy, amorphous
// ──────────────────────────────────────────────────────────────

const VOIDLING_BASE: Record<EvolutionStage, string> = {
  egg: [
    ' ◉◉',
    '▓▓▓▓',
    '▓▓▓▓',
  ].join('\n'),

  baby: [
    ' ▓▓▓▓▓▓▓▓',
    '▓▓  ◉◉  ▓▓',
    '▓▓   ⌣  ▓▓',
    ' ▓▓▓▓▓▓▓▓',
    '  ▓▓  ▓▓',
  ].join('\n'),

  child: [
    ' ▓▓▓▓▓▓▓▓▓▓▓',
    '▓▓   ◉◉   ▓▓',
    '▓▓    ▰   ▓▓',
    '▓▓  ▓▓▓▓▓ ▓▓',
    ' ▓▓▓▓▓▓▓▓▓▓▓',
    '  ▐▓▓   ▓▓▌',
  ].join('\n'),

  teen: [
    ' ▓▓▓▓▓▓▓▓▓▓▓▓▓',
    '▓▓    ◉  ◉    ▓▓',
    '▓▓     ▰     ▓▓',
    '▓▓   ▓▓▓▓▓  ▓▓',
    ' ▓▓▓▓▓▓▓▓▓▓▓▓▓',
    '  ▐▓▓▓   ▓▓▓▌',
  ].join('\n'),

  adult: [
    ' ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓',
    '▓▓     ◉  ◉     ▓▓',
    '▓▓      ▰       ▓▓',
    '▓▓    ▓▓▓▓▓    ▓▓',
    ' ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓',
    '  ▐▓▓▓▓   ▓▓▓▓▌',
  ].join('\n'),
};

const VOIDLING_MOODS: Record<Mood, { eyes: string; mouth: string }> = {
  happy:     { eyes: '◉  ◉', mouth: '  ▰  ' },
  mischief:  { eyes: '◉  ◉', mouth: '  ╰  ' },
  hungry:    { eyes: '◉  ◉', mouth: '  ○  ' },
  sad:       { eyes: '◡  ◡', mouth: '  ⌒  ' },
  angry:     { eyes: '◉  ◉', mouth: '  ▄  ' },
  content:   { eyes: '◉  ◉', mouth: '  ~  ' },
  bored:     { eyes: '◉  ◉', mouth: '  ·  ' },
  ecstatic:  { eyes: '◉  ◉', mouth: '  ▽  ' },
  sick:      { eyes: '×  ×', mouth: '  ≈  ' },
  sleeping:  { eyes: '·  ·', mouth: '  ◡  ' },
};

const VOIDLING_BRANCHES: Record<Exclude<EvolutionBranch, 'neutral'>, { topDecoration: string }> = {
  angel:    { topDecoration: ' ○ ' },   // tiny halo above
  trickster: { topDecoration: ' ◔◉ ' }, // winking eye
  gremlin:  { topDecoration: ' ▲▲ ' },  // horn nubs
  sage:     { topDecoration: ' ·  ' },  // wisdom mark
};

// ──────────────────────────────────────────────────────────────
// Consolidated export
// ──────────────────────────────────────────────────────────────

export const CREATURES: Record<Species, CreatureArt> = {
  stardrop: {
    stages: STARDROP_BASE,
    moods: STARDROP_MOODS as unknown as Record<Mood, string>,
    branches: STARDROP_BRANCHES as unknown as Record<Exclude<EvolutionBranch, 'neutral'>, string>,
  },
  voidling: {
    stages: VOIDLING_BASE,
    moods: VOIDLING_MOODS as unknown as Record<Mood, string>,
    branches: VOIDLING_BRANCHES as unknown as Record<Exclude<EvolutionBranch, 'neutral'>, string>,
  },
}
