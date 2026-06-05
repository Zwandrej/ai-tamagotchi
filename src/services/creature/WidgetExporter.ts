/**
 * WidgetExporter — Syncs creature state with the iOS widget.
 * 
 * Writes JSON to App Group container for widget + debug copy to Documents.
 * THIS IS A TEST: writes a hardcoded file first to verify RNFS works.
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import type { CreatureState } from '../../types/creature';

export function exportWidgetState(state: CreatureState | null): void {
  if (Platform.OS !== 'ios') return;

  const data = state ? {
    name: state.name,
    species: state.dna.genotype.species,
    stage: state.stage,
    mood: state.personality.mood,
    age: state.age,
    hunger: Math.round(state.stats.hunger),
    happiness: Math.round(state.stats.happiness),
    energy: Math.round(state.stats.energy),
    hygiene: Math.round(state.stats.hygiene),
    ascii: '✦',
    lastInteraction: new Date().toISOString(),
  } : null;

  const json = JSON.stringify(data);

  // Write to Documents (verify RNFS works at all)
  const docPath = RNFS.DocumentDirectoryPath + '/widget_debug.json';
  try {
    RNFS.writeFile(docPath, json, 'utf8');
  } catch (e) {
    // ignore
  }
}
