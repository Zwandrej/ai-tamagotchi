# Creature DNA Specification v1.0

## Overview

Every AI Tamagotchi creature has a unique genetic identity — its DNA. DNA determines personality traits, evolution potential, and statistical predispositions. DNA is procedurally generated at creation and persists with the creature forever.

## Structure

### Genotype (inherited)
- `species`: 'stardrop' | 'voidling'
- `baseStats`: StatProfile — vitality, charm, curiosity, gluttony, sociability, mischief (0-255 each)
- `traitAlleles`: Per-trait allele pairs for playfulness, empathy, bravery, patience, expressiveness, independence
- `mutationSeed`: Deterministic seed for procedural generation

### Phenotype (expressed)
- `expressedTraits`: TraitProfile — final 0.0-1.0 values computed from alleles + environment
- `stage`: Evolution stage
- `branch`: Evolution branch
- `appearance`: AppearanceDNA — palette, eye shape, mouth shape, accessory, size, glow

### History
- `birthday`: ISO date string
- `keyMemories`: MemoryGene[] — episodic memories (max 20)
- `careSummary`: CareSummary — feed/play/clean ratios, neglect streak, response times
- `totalDaysAlive`, `totalInteractions`

## Trait Profile
| Trait | Range | Affects |
|---|---|---|
| playfulness | 0-1 | Happiness from play, evolution to Trickster |
| empathy | 0-1 | Evolution to Angel |
| bravery | 0-1 | Response to harsh words |
| patience | 0-1 | Slow decay, evolution to Sage |
| expressiveness | 0-1 | Response variety |
| independence | 0-1 | Evolution to Gremlin, neediness |

## Memory Gene
Each significant event creates a memory:
- `id: string` — unique identifier
- `tag: string` — short label ('first_hatch', 'fed', 'harsh_words')
- `event: string` — human-readable description
- `impact: number` — -1.0 to 1.0
- `traitAffected: string` — which trait was impacted
- `mood: string` — creature's mood at event time
- `statsAtTime`: Stat snapshot at event time
- `timestamp: string` — ISO datetime

Memories are sorted by impact magnitude, capped at 20.

## Persistence

DNA is stored in MMKV alongside the creature state. The entire `CreatureState` (including DNA) is serialized as JSON and loaded on app restart.

## Export / Future

DNA is self-contained. Future features:
- `.tamadna.json` export format for sharing creatures
- Cross-app creature portability
- Breeding (combining two DNAs)
