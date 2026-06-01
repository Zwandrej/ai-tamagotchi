/**
 * MemoryScreen — View creature's episodic memories.
 * Terminal-style log of significant events.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useCreatureStore } from '../store/useCreatureStore';
import { Term } from '../theme';

export function MemoryScreen() {
  const creature = useCreatureStore((s) => s.creature);

  if (!creature) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>$ memory --dump</Text>
        <Text style={styles.err}>No creature loaded</Text>
      </View>
    );
  }

  const memories = [...creature.dna.history.keyMemories].reverse();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Text style={styles.header}>$ cat /proc/creature/memory.log</Text>
      <Text style={styles.sub}>━━ {memories.length} memories stored ━━</Text>

      {memories.map((mem) => (
        <View key={mem.id} style={styles.entry}>
          <View style={styles.entryHeader}>
            <Text style={styles.timestamp}>
              [{new Date(mem.timestamp).toLocaleDateString()}]
            </Text>
            <Text style={[styles.tag, { color: mem.impact > 0 ? Term.green : Term.red }]}>
              #{mem.tag}
            </Text>
          </View>
          <Text style={styles.event}>{mem.event}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>
              mood: {mem.mood}  •  impact: {mem.impact > 0 ? '+' : ''}{mem.impact.toFixed(1)}  •  trait: {mem.traitAffected}
            </Text>
            {mem.statsAtTime && (
              <Text style={styles.metaText}>
                stats: hunger {mem.statsAtTime.hunger}%  happy {mem.statsAtTime.happiness}%  energy {mem.statsAtTime.energy}%
              </Text>
            )}
          </View>
        </View>
      ))}

      {memories.length === 0 && (
        <Text style={styles.emptyMem}>-- no memories yet --</Text>
      )}

      <Text style={styles.footer}>$ exit</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Term.bg },
  scroll: { padding: 12, paddingBottom: 60 },
  header: { color: Term.text, fontFamily: Term.font, fontSize: Term.fontSizeSm, marginBottom: 4 },
  sub: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs, marginBottom: 16 },
  entry: {
    borderWidth: 1, borderColor: Term.border,
    padding: 10, marginBottom: 10,
  },
  entryHeader: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  timestamp: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs },
  tag: { fontFamily: Term.font, fontSize: Term.fontSizeXs, fontWeight: '700' },
  event: { color: Term.text, fontFamily: Term.font, fontSize: Term.fontSize, marginBottom: 6, fontStyle: 'italic' },
  meta: { gap: 2 },
  metaText: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs },
  emptyMem: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSize, textAlign: 'center', marginTop: 20 },
  footer: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs, marginTop: 20 },
  empty: { flex: 1, backgroundColor: Term.bg, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeSm },
  err: { color: Term.red, fontFamily: Term.font, fontSize: Term.fontSizeLg, marginTop: 4 },
});
