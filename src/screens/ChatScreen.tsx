/**
 * ChatScreen — Terminal-style conversation log.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreatureStore } from '../store/useCreatureStore';
import { CreatureCard } from '../components/creature/CreatureCard';
import { createConversation, addMessage, type ConversationState } from '../services/conversation/conversationManager';
import { generateResponse } from '../services/creature/AIService';
import { Term } from '../theme';
import type { ConversationMessage } from '../types/conversation';
import type { CreatureState } from '../types/creature';

export function ChatScreen() {
  const creature = useCreatureStore((s) => s.creature);
  const chat = useCreatureStore((s) => s.chat);
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState('');
  const [conv, setConv] = useState<ConversationState>(createConversation);
  const [happinessDelta, setHappinessDelta] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !creature) return;
    try {
      const beforeHap = creature.stats.happiness;
      const withUser = addMessage(conv, 'user', trimmed, creature);
      const response = await generateResponse(creature, trimmed, conv.messages.slice(-10));
      const withCreature = addMessage(withUser, 'creature', response, creature);
      setConv(withCreature);
      chat(trimmed, response);
      setInputText('');

      // Show happiness change after state updates
      const afterCreature = useCreatureStore.getState().creature;
      if (afterCreature) {
        const delta = afterCreature.stats.happiness - beforeHap;
        setHappinessDelta(delta);
        setTimeout(() => setHappinessDelta(null), 3000);
      }

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      Alert.alert('[err]', err?.message || 'Message failed');
    }
  }, [inputText, conv, creature, chat]);

  if (!creature) {
    return (
      <View style={styles.empty}>
        <Text style={styles.prompt}>$ chat --open</Text>
        <Text style={styles.error}>Error: no creature loaded</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages — terminal log style */}
      <FlatList
        ref={flatListRef}
        data={conv.messages}
        keyExtractor={(_, i) => String(i)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        renderItem={({ item }) => (
          <View style={styles.msgRow}>
            <Text style={item.role === 'user' ? styles.promptUser : styles.promptCreature}>
              {item.role === 'user' ? '$' : '#'}
            </Text>
            <Text style={item.role === 'user' ? styles.userMsg : styles.creatureMsg}>
              {item.content}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <CreatureCard creature={creature} compact />
            {happinessDelta !== null && (
              <Text style={[styles.hapDelta, { color: happinessDelta >= 0 ? Term.green : Term.red }]}>
                [{happinessDelta >= 0 ? '+' : ''}{happinessDelta}] happiness
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyChat}>$ chat.log -- new session --</Text>
        }
      />

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Text style={styles.inputPrompt}>$</Text>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="type a message..."
          placeholderTextColor={Term.textDim}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Text style={styles.sendText}>↵</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Term.bg },
  header: {
    backgroundColor: Term.surface, borderBottomWidth: 1, borderBottomColor: Term.border,
    paddingBottom: 6,
  },
  list: { flex: 1 },
  listContent: { padding: 12 },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  promptUser: {
    color: Term.green, fontFamily: Term.font, fontSize: Term.fontSizeSm,
    width: 20, marginRight: 4,
  },
  promptCreature: {
    color: Term.text, fontFamily: Term.font, fontSize: Term.fontSizeSm,
    width: 20, marginRight: 4,
  },
  userMsg: { color: Term.green, fontFamily: Term.font, fontSize: Term.fontSize, flex: 1 },
  creatureMsg: { color: Term.text, fontFamily: Term.font, fontSize: Term.fontSize, flex: 1, fontStyle: 'italic' },
  emptyChat: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Term.border,
    padding: 10, backgroundColor: Term.surface,
  },
  inputPrompt: { color: Term.green, fontFamily: Term.font, fontSize: Term.fontSize, marginRight: 6 },
  input: {
    flex: 1, color: Term.text, fontFamily: Term.font, fontSize: Term.fontSize,
    padding: 0,
  },
  sendBtn: { padding: 4 },
  sendText: { color: Term.text, fontFamily: Term.font, fontSize: 18 },
  empty: { flex: 1, backgroundColor: Term.bg, alignItems: 'center', justifyContent: 'center', padding: 40 },
  prompt: { color: Term.textDim, fontFamily: Term.font, fontSize: Term.fontSizeXs, marginBottom: 4 },
  error: { color: Term.red, fontFamily: Term.font, fontSize: Term.fontSizeLg },
  hapDelta: { fontFamily: Term.font, fontSize: Term.fontSizeXs, textAlign: 'center', paddingBottom: 4 },
});
