/**
 * WidgetExporter — Syncs creature state with the iOS widget.
 *
 * Writes a JSON snapshot to shared App Group UserDefaults
 * via native module. Called after every state change.
 */

import { NativeModules, Platform } from 'react-native';
import type { CreatureState } from '../../types/creature';

const { WidgetBridge } = NativeModules;

export function exportWidgetState(state: CreatureState | null): void {
  if (Platform.OS !== 'ios' || !WidgetBridge) return;

  if (!state) {
    WidgetBridge.exportState(JSON.stringify(null));
    return;
  }

  const data = {
    name: state.name,
    species: state.dna.genotype.species,
    stage: state.stage,
    mood: state.personality.mood,
    age: state.age,
    hunger: state.stats.hunger,
    happiness: state.stats.happiness,
    energy: state.stats.energy,
    hygiene: state.stats.hygiene,
    ascii: getAsciiSnapshot(state),
    lastInteraction: new Date().toISOString(),
  };

  WidgetBridge.exportState(JSON.stringify(data));
}

function getAsciiSnapshot(state: CreatureState): string {
  // Use top 4 lines of the ASCII art for the widget
  const { renderCreatureFace } = require('./asciiRenderer');
  try {
    return renderCreatureFace(state);
  } catch {
    return '✦';
  }
}
