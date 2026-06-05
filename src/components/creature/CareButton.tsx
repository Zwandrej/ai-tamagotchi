/**
 * CareButton — Terminal-style action button.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { CareAction } from '../../types/creature';
import { Term } from '../../theme';

interface CareButtonProps {
  action: CareAction;
  onPress: (action: CareAction) => void;
  disabled?: boolean;
}

const CONFIG: Record<CareAction, { label: string; color: string }> = {
  feed: { label: 'feed', color: Term.red },
  play: { label: 'play', color: Term.textBright },
  clean: { label: 'clean', color: Term.green },
  heal: { label: 'heal', color: Term.redDim },
  tuck_in: { label: 'sleep', color: Term.greenDim },
  wake_up: { label: 'wake', color: Term.text },
  scold: { label: 'scold', color: Term.red },
};

export function CareButton({ action, onPress, disabled = false }: CareButtonProps) {
  const { label, color } = CONFIG[action];
  return (
    <TouchableOpacity
      style={[styles.btn, { borderColor: disabled ? Term.border : color }]}
      onPress={() => onPress(action)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, { color: disabled ? Term.textDim : color }]}>
        $ care --{label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6,
  },
  label: {
    fontFamily: Term.font, fontSize: Term.fontSizeXs,
  },
});
