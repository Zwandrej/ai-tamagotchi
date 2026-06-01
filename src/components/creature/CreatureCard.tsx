/**
 * CreatureCard — Terminal-style creature display.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CreatureState, Mood } from '../../types/creature';
import { renderCreature } from '../../services/creature/asciiRenderer';
import { Term } from '../../theme';

interface CreatureCardProps {
  creature: CreatureState;
  compact?: boolean;
}

const MOOD_LABELS: Record<Mood, string> = {
  ecstatic: '[*]', happy: '[+]', content: '[~]', bored: '[-]',
  hungry: '[!]', sad: '[…]', angry: '[x]', sick: '[?]', sleeping: '[z]', mischief: '[;]',
};

export function CreatureCard({ creature, compact = false }: CreatureCardProps) {
  const ascii = renderCreature(creature);
  const mood = creature.isSleeping ? 'sleeping' : creature.personality.mood;
  const species = creature.dna.genotype.species;

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.compactAscii} numberOfLines={3}>{ascii}</Text>
        <View style={styles.compactInfo}>
          <Text style={styles.compactName}>{creature.name}</Text>
          <Text style={styles.compactMood}>{MOOD_LABELS[mood]}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.ascii}>{ascii}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>[{species}] {creature.name}</Text>
        <Text style={styles.mood}>{MOOD_LABELS[mood]} {mood}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8, alignItems: 'center' },
  ascii: { color: Term.text, fontFamily: Term.fontMono, fontSize: 10, lineHeight: 13, marginBottom: 8, textAlign: 'center' },
  info: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  name: { color: Term.text, fontFamily: Term.font, fontSize: Term.fontSizeSm, fontWeight: '700' },
  mood: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeSm },
  compact: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, gap: 8,
  },
  compactAscii: { color: Term.text, fontFamily: Term.fontMono, fontSize: 6, lineHeight: 8, flex: 1 },
  compactInfo: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  compactName: { color: Term.text, fontFamily: Term.font, fontSize: Term.fontSizeSm, fontWeight: '700' },
  compactMood: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeSm },
});
