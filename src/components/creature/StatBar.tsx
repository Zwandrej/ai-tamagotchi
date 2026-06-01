/**
 * StatBar — Terminal-style progress indicator.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Term } from '../../theme';

interface StatBarProps {
  label: string;
  value: number;
  emoji?: string;
  color?: string;
  invert?: boolean;
}

export function StatBar({ label, value, color = Term.text, invert = false }: StatBarProps) {
  const pct = invert ? 100 - value : value;
  const barColor = pct > 70 ? Term.green : pct > 30 ? Term.text : Term.red;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label.padEnd(10, ' ')}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.val, { color: barColor }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  label: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs, width: 80 },
  barBg: {
    flex: 1, height: 6, backgroundColor: Term.border,
    marginHorizontal: 8,
  },
  barFill: { height: 6 },
  val: { fontFamily: Term.font, fontSize: Term.fontSizeXs, width: 30, textAlign: 'right' },
});
