/**
 * CreateCreatureScreen — Terminal-style creature init.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useCreatureStore } from '../store/useCreatureStore';
import { createCreature } from '../services/creature/creatureEngine';
import { renderCreature } from '../services/creature/asciiRenderer';
import { MODELS, type ModelInfo } from '../services/creature/ModelManager';
import { isModelDownloaded, downloadModel, loadModel, getModelPath } from '../services/creature/AIService';
import { importDNA, buildDNAExport } from '../services/creature/dna';
import { Term } from '../theme';
import type { Species } from '../constants/creatures';
import type { CreatureDNA } from '../types/creature';

const OPTIONS = [
  { species: 'stardrop' as Species, name: '[stardrop]', subtitle: 'gentle, sparkly, full of wonder', accent: Term.textBright },
  { species: 'voidling' as Species, name: '[voidling]', subtitle: 'fluid, curious, a little mysterious', accent: Term.green },
];

export function CreateCreatureScreen() {
  const [selected, setSelected] = useState<Species | null>(null);
  const [name, setName] = useState('');
  const [modelId, setModelId] = useState<string>(MODELS[0]!.id);
  const [downloadPct, setDownloadPct] = useState<Record<string, number>>({});
  const [downloading, setDownloading] = useState<string | null>(null);
  const [importedDNA, setImportedDNA] = useState<CreatureDNA | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const storeCreate = useCreatureStore((s) => s.create);
  const storeCreateFromDNA = useCreatureStore((s) => s.createFromDNA);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleImportDNA = () => {
    setShowImportModal(true);
  };

  const doImportDNA = () => {
    try {
      const dna = importDNA(importText);
      const inheritedEpi: Record<string, number> = {};
      for (const [k, v] of Object.entries(dna.epigenome || {})) {
        inheritedEpi[k] = Math.round((v as number) * 0.7 * 1000) / 1000;
      }
      dna.epigenome = inheritedEpi;
      dna.breeding.generation++;
      dna.breeding.parentIds.push(dna.id);
      setImportedDNA(dna);
      if (dna.genotype.species) setSelected(dna.genotype.species);
      setName(dna.phenotype.name ? `${dna.phenotype.name}-jr` : '');
      setShowImportModal(false);
      setImportText('');
    } catch (err: any) {
      Alert.alert('[err]', err.message || 'Invalid DNA');
    }
  };

  const handleCreateFromDNA = async () => {
    if (!importedDNA) return;
    const trimmed = name.trim() || importedDNA.phenotype.name || 'spark';
    try {
      const model = MODELS.find(m => m.id === modelId);
      if (model?.url && isModelDownloaded(modelId)) {
        await loadModel(getModelPath(modelId)!, modelId);
      }
      // Create creature from inherited DNA (species auto-derived from genotype)
      storeCreateFromDNA(importedDNA, trimmed);
      navigation.replace('Home');
    } catch (err: any) { Alert.alert('[err]', err?.message || 'Failed.'); }
  };

  const handleSelectModel = async (id: string) => {
    setModelId(id);
    const model = MODELS.find(m => m.id === id);
    if (!model || !model.url) return;
    if (isModelDownloaded(id)) return;
    setDownloading(id);
    try {
      await downloadModel(id, (pct) => setDownloadPct(prev => ({ ...prev, [id]: pct })));
    } catch (err: any) { Alert.alert('[err]', err.message); }
    setDownloading(null);
  };

  const handleCreate = async () => {
    if (!selected) return;
    const trimmed = name.trim() || getDefaultName(selected);
    try {
      const model = MODELS.find(m => m.id === modelId);
      if (model?.url && isModelDownloaded(modelId)) {
        await loadModel(getModelPath(modelId)!, modelId);
      }
      storeCreate(selected, trimmed);
      navigation.replace('Home');
    } catch (err: any) { Alert.alert('[err]', err?.message || 'Failed.'); }
  };

  const previewCreature = selected
    ? createCreature(selected, name.trim() || getDefaultName(selected))
    : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>$ ./init_creature.sh</Text>

      {/* Species */}
      <View style={styles.box}>
        <Text style={styles.label}># select species</Text>
        <View style={styles.speciesGrid}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.species;
            return (
              <TouchableOpacity
                key={opt.species}
                style={[styles.speciesCard, {
                  borderColor: isSelected ? opt.accent : Term.border,
                  backgroundColor: isSelected ? opt.accent + '10' : Term.surface,
                }]}
                onPress={() => setSelected(opt.species)}
                activeOpacity={0.8}
              >
                <Text style={[styles.speciesName, { color: opt.accent }]}>{opt.name}</Text>
                <Text style={styles.speciesSub}>{opt.subtitle}</Text>
                {isSelected && <Text style={[styles.check, { color: opt.accent }]}>[x]</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Preview */}
      {previewCreature && (
        <View style={styles.box}>
          <Text style={styles.label}># preview</Text>
          <Text style={styles.previewAscii}>{renderCreature(previewCreature)}</Text>
        </View>
      )}

      {/* Name */}
      <View style={styles.box}>
        <Text style={styles.label}># name your creature</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.prompt}>$ name=</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={selected ? getDefaultName(selected) : '...'}
            placeholderTextColor={Term.textDim}
            maxLength={20}
            autoFocus
          />
        </View>
      </View>

      {/* Model */}
      <View style={styles.box}>
        <Text style={styles.label}># select brain (LLM)</Text>
        {MODELS.map((m: ModelInfo) => {
          const isSelected = modelId === m.id;
          const pct = downloadPct[m.id] || 0;
          const downloadingThis = downloading === m.id;
          const downloaded = isModelDownloaded(m.id) || !m.url;
          return (
            <TouchableOpacity
              key={m.id}
              style={[styles.modelRow, {
                borderColor: isSelected ? Term.text : Term.border,
                backgroundColor: isSelected ? Term.text + '10' : Term.surface,
              }]}
              onPress={() => handleSelectModel(m.id)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.modelName, { color: isSelected ? Term.text : Term.textDim }]}>
                  [{m.id}] {m.name}
                </Text>
                <Text style={styles.modelDesc}>
                  {m.size !== 'built-in' ? `${m.size} ${m.quant}` : 'built-in'} — {m.description}
                </Text>
                {downloadingThis && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.downloadText}>
                      [{pct === 100 ? 'done' : '···'}] downloading… {pct}%
                    </Text>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                )}
                {downloaded && m.url && (
                  <Text style={{ color: Term.greenDim, fontSize: Term.fontSizeXs, fontFamily: Term.font, marginTop: 4 }}>
                    [ok] downloaded
                  </Text>
                )}
              </View>
              {isSelected && <Text style={{ color: Term.text, fontSize: 16 }}>*</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Import DNA */}
      <TouchableOpacity
        style={[styles.hatchBtn, {
          backgroundColor: Term.surface,
          borderColor: Term.textDim,
          marginBottom: 8,
        }]}
        onPress={handleImportDNA}
        activeOpacity={0.8}
      >
        <Text style={[styles.hatchText, { color: Term.textDim }]}>[import dna]</Text>
      </TouchableOpacity>

      {/* Show imported DNA info */}
      {importedDNA && (
        <View style={[styles.box, { borderColor: Term.textDim }]}>
          <Text style={styles.label}># inherited DNA</Text>
          <Text style={{ color: Term.text, fontFamily: Term.font, fontSize: Term.fontSizeXs }}>
            From: {importedDNA.phenotype.name} ({importedDNA.genotype.species})
          </Text>
          <Text style={{ color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs }}>
            Gen: {importedDNA.breeding.generation} | Interactions: {importedDNA.history.totalInteractions}
          </Text>
          <Text style={{ color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs }}>
            Epigenetic markers inherited at 70% strength
          </Text>
        </View>
      )}

      {/* Hatch */}
      <TouchableOpacity
        style={[styles.hatchBtn, {
          opacity: selected ? 1 : 0.4,
          borderColor: selected ? Term.text : Term.border,
        }]}
        onPress={importedDNA ? handleCreateFromDNA : handleCreate}
        disabled={!(importedDNA || selected)}
        activeOpacity={0.8}
      >
        <Text style={[styles.hatchText, { color: (importedDNA || selected) ? Term.bg : Term.textDim }]}>
          {importedDNA
            ? `$ hatch ${name.trim() || importedDNA.phenotype.name || 'spark'} (gen ${importedDNA.breeding.generation})`
            : `$ hatch ${selected ? (name.trim() || getDefaultName(selected)) : '?'}`}
        </Text>
      </TouchableOpacity>

      {/* Import DNA Modal */}
      <Modal visible={showImportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={[styles.label, { marginBottom: 8 }]}># import DNA</Text>
            <TextInput
              style={styles.importInput}
              value={importText}
              onChangeText={setImportText}
              placeholder='{ "version": "1.0", "id": "dna_...", ... }'
              placeholderTextColor={Term.border}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Term.surface, borderColor: Term.border }]}
                onPress={() => { setShowImportModal(false); setImportText(''); }}
              >
                <Text style={[styles.modalBtnText, { color: Term.textDim }]}>cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Term.text }]}
                onPress={doImportDNA}
              >
                <Text style={[styles.modalBtnText, { color: Term.bg }]}>import</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function getDefaultName(species: Species): string {
  return species === 'stardrop' ? 'pixel' : 'ink';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Term.bg },
  scroll: { padding: 12, paddingBottom: 40 },
  title: {
    color: Term.text, fontFamily: Term.font, fontSize: Term.fontSize,
    marginBottom: 16,
  },
  box: {
    borderWidth: 1, borderColor: Term.border,
    padding: 10, marginBottom: 12,
  },
  label: {
    color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs,
    marginBottom: 8,
  },
  prompt: {
    color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeSm,
    marginRight: 4,
  },
  speciesGrid: { gap: 8 },
  speciesCard: {
    borderWidth: 1, borderRadius: 2, padding: 10, marginBottom: 8,
  },
  speciesName: { fontFamily: Term.font, fontSize: Term.fontSize, fontWeight: '700', marginBottom: 2 },
  speciesSub: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs },
  check: { fontFamily: Term.font, fontSize: Term.fontSizeSm, marginTop: 4 },
  previewAscii: {
    color: Term.text, fontFamily: Term.fontMono, fontSize: 10, lineHeight: 13,
    textAlign: 'center',
  },
  input: {
    flex: 1, color: Term.text, fontFamily: Term.font, fontSize: Term.fontSize,
    padding: 0,
  },
  modelRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, padding: 10, marginBottom: 6, gap: 8,
  },
  modelName: { fontFamily: Term.font, fontSize: Term.fontSizeSm, fontWeight: '700', marginBottom: 2 },
  modelDesc: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs },
  downloadText: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs, marginBottom: 2 },
  progressBar: { height: 2, backgroundColor: Term.border },
  progressFill: { height: 2, backgroundColor: Term.text },
  hatchBtn: {
    borderWidth: 1, padding: 14, alignItems: 'center',
    backgroundColor: Term.text,
  },
  hatchText: { fontFamily: Term.font, fontSize: Term.fontSize, fontWeight: '700' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', padding: 20,
  },
  modalBox: {
    backgroundColor: Term.surface, borderWidth: 1, borderColor: Term.border,
    padding: 16, borderRadius: 4,
  },
  importInput: {
    color: Term.text, fontFamily: Term.fontMono, fontSize: 10,
    borderWidth: 1, borderColor: Term.border,
    padding: 8, minHeight: 80,
    backgroundColor: Term.bg,
  },
  modalBtn: {
    flex: 1, borderWidth: 1, padding: 10, alignItems: 'center',
  },
  modalBtnText: {
    fontFamily: Term.font, fontSize: Term.fontSizeSm, fontWeight: '700',
  },
});
