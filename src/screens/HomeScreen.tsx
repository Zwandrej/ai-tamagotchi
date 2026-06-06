/**
 * HomeScreen — Terminal-style creature dashboard.
 */

import React, { useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useCreatureStore } from '../store/useCreatureStore';
import { CreatureCard } from '../components/creature/CreatureCard';
import { StatBar } from '../components/creature/StatBar';
import { CareButton } from '../components/creature/CareButton';
import { isCreatureDead } from '../services/creature/creatureEngine';
import { Term } from '../theme';
import type { CareAction } from '../types/creature';

export function HomeScreen() {
  const creature = useCreatureStore((s) => s.creature);
  const care = useCreatureStore((s) => s.care);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Auto-redirect to Create if creature is null (e.g. after migration reset)
  useEffect(() => {
    if (!creature) {
      navigation.reset({ index: 0, routes: [{ name: 'Create' }] });
    }
  }, [creature, navigation]);

  const handleCare = useCallback(
    (action: CareAction) => {
      try {
        care(action);
        Alert.alert('[ok]', `$ care --${action.replace('_', '-')}`);
      } catch (err: any) {
        Alert.alert('[err]', err?.message || String(err));
      }
    },
    [care]
  );

  if (!creature || !creature.personality || !creature.stats) {
    return (
      <View style={styles.empty}>
        <Text style={styles.prompt}>$ creature --status</Text>
        <Text style={styles.output}>No creature loaded. Create one first.</Text>
        <Text style={styles.cursor}>▮</Text>
      </View>
    );
  }

  // Death screen
  if (isCreatureDead(creature)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.prompt}>$ creature --status</Text>
        <Text style={[styles.output, { color: Term.red }]}>SIGNAL LOST</Text>
        <Text style={[styles.output, { fontSize: 11, marginTop: 8 }]}>
          {creature.name} has passed away from neglect.
        </Text>
        <Text style={styles.grave}>
          {'   R.I.P.\n  ┌─────┐\n  │  ✦  │\n  │ RIP │\n  └─────┘'}
        </Text>
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            const store = useCreatureStore.getState();
            store.reset();
          }}
        >
          <Text style={styles.resetText}>$ hatch --new</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSleeping = creature.isSleeping;
  const disabledActions: CareAction[] = isSleeping
    ? ['feed', 'play', 'clean', 'heal', 'tuck_in']
    : ['wake_up'];
  const allActions: CareAction[] = ['feed', 'play', 'clean', 'heal', 'tuck_in', 'wake_up', 'scold'];

  return (
    <View style={styles.screen}>
      {/* Scanline overlay */}
      <View style={styles.scanlines} pointerEvents="none" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Status bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            [{creature.dna.genotype.species}] {creature.name} | mood: {creature.personality.mood} | age: {creature.totalInteractions}t
          </Text>
        </View>

        {/* Creature display */}
        <View style={styles.asciiBox}>
          <Text style={styles.asciiLabel}>$ cat /proc/creature</Text>
          <CreatureCard creature={creature} />
        </View>

        {/* Stats — terminal style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>$ stats --all</Text>
          <StatBar label="hunger" value={creature.stats.hunger} emoji="" color={Term.red} invert />
          <StatBar label="happiness" value={creature.stats.happiness} emoji="" color={Term.textBright} />
          <StatBar label="energy" value={creature.stats.energy} emoji="" color={Term.green} />
          <StatBar label="hygiene" value={creature.stats.hygiene} emoji="" color={Term.greenDim} />
        </View>

        {/* Care actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>$ care --help</Text>
          <View style={styles.careGrid}>
            {allActions.map((action) => (
              <CareButton
                key={action}
                action={action}
                onPress={handleCare}
                disabled={disabledActions.includes(action)}
              />
            ))}
          </View>
        </View>

        {/* Thought */}
        {creature && (
          <View style={styles.thoughtBubble}>
            <Text style={styles.prompt}>$ creature --think</Text>
            <Text style={styles.thoughtText}>
              {useCreatureStore.getState().lastThought || '…'}
            </Text>
          </View>
        )}

        {/* Reset — matches [mem]/[chat] button style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>$ creature --manage</Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Hatch a new creature?',
                'Your current creature will be lost forever.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Hatch New',
                    style: 'destructive',
                    onPress: () => useCreatureStore.getState().reset(),
                  },
                ],
              );
            }}
          >
            <Text style={styles.resetSmallText}>[hatch new]</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Term.bg,
  },
  scanlines: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
    opacity: 0.04,
    // Scanline effect via repeating gradient-like pattern
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 40 },
  statusBar: {
    borderBottomWidth: 1, borderBottomColor: Term.border,
    paddingBottom: 6, marginBottom: 12,
  },
  statusText: {
    color: Term.textDim, fontSize: Term.fontSizeXs, fontFamily: Term.font,
  },
  asciiBox: {
    borderWidth: 1, borderColor: Term.border,
    padding: 10, marginBottom: 14,
  },
  asciiLabel: {
    color: Term.textDim, fontSize: Term.fontSizeXs, fontFamily: Term.font,
    marginBottom: 6,
  },
  section: {
    borderWidth: 1, borderColor: Term.border,
    padding: 10, marginBottom: 14,
  },
  sectionTitle: {
    color: Term.textDim, fontSize: Term.fontSizeXs, fontFamily: Term.font,
    marginBottom: 8,
  },
  careGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  thoughtBubble: {
    borderWidth: 1, borderColor: Term.border,
    padding: 10, marginBottom: 14,
  },
  thoughtText: {
    color: Term.text, fontSize: Term.fontSize, fontFamily: Term.font,
    fontStyle: 'italic',
  },
  empty: {
    flex: 1, backgroundColor: Term.bg,
    alignItems: 'center', justifyContent: 'center',
    padding: 40,
  },
  prompt: {
    color: Term.textDim, fontSize: Term.fontSizeXs, fontFamily: Term.font,
    marginBottom: 4,
  },
  output: {
    color: Term.text, fontSize: Term.fontSizeLg, fontFamily: Term.font,
  },
  cursor: {
    color: Term.text, fontSize: Term.fontSizeLg, fontFamily: Term.font,
    marginTop: 8,
  },
  grave: {
    color: Term.textDim, fontFamily: Term.fontMono, fontSize: 10,
    textAlign: 'center', marginTop: 16, lineHeight: 14,
  },
  resetBtn: {
    borderWidth: 1, borderColor: Term.text,
    padding: 10, marginTop: 20,
  },
  resetText: {
    color: Term.text, fontFamily: Term.font, fontSize: Term.fontSizeSm,
  },
  resetSmallText: {
    color: Term.textDim, fontFamily: Term.font, fontSize: 12,
  },
});
