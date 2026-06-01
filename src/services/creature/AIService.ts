/**
 * AI Service — On-device LLM via llama.rn (llama.cpp binding).
 *
 * Manages model lifecycle: download, load, inference.
 * DNA, personality, mood, creature state, and conversation history
 * are all injected into the context window for every response.
 */

import { initLlama, type LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import type { CreatureState } from '../../types/creature';
import { MODELS, buildLLMPrompt, type ModelInfo } from './ModelManager';

// ──────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────

let _context: LlamaContext | null = null;
let _activeModelId = '';
const _downloadedModels = new Map<string, string>();
let _inferenceLock = false; // serialize llama context access // modelId -> filePath

// ──────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────

export function getActiveModel(): string {
  return _activeModelId;
}

export function isModelLoaded(): boolean {
  return _context !== null;
}

export function isModelDownloaded(modelId: string): boolean {
  return _downloadedModels.has(modelId);
}

export function getModelPath(modelId: string): string | undefined {
  return _downloadedModels.get(modelId);
}

/**
 * Download a GGUF model from HuggingFace.
 * Saves to app's document directory. Reports progress 0-100.
 */
export async function downloadModel(
  modelId: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);
  if (!model.url) throw new Error(`${model.name} requires no download`);

  // Check if already downloaded
  if (_downloadedModels.has(modelId)) {
    onProgress?.(100);
    return _downloadedModels.get(modelId)!;
  }

  const dir = `${RNFS.DocumentDirectoryPath}/models`;
  await RNFS.mkdir(dir);
  const filename = `${modelId}.gguf`;
  const destPath = `${dir}/${filename}`;

  // Check if file already exists on disk
  const exists = await RNFS.exists(destPath);
  if (exists) {
    _downloadedModels.set(modelId, destPath);
    onProgress?.(100);
    return destPath;
  }

  // Download with progress
  const { promise, jobId } = RNFS.downloadFile({
    fromUrl: model.url,
    toFile: destPath,
    progress: (res) => {
      const pct = Math.round((res.bytesWritten / res.contentLength) * 100);
      onProgress?.(pct);
    },
    progressDivider: 10,
  });

  const result = await promise;
  if (result.statusCode === 200) {
    _downloadedModels.set(modelId, destPath);
    return destPath;
  }
  throw new Error(`Download failed: ${result.statusCode}`);
}

/**
 * Load a GGUF model into memory for inference.
 * Model must already be downloaded.
 */
export async function loadModel(
  modelPath: string,
  modelId: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (_context) {
    try { _context.release(); } catch {}
    _context = null;
  }

  onProgress?.(0);
  _context = await initLlama(
    {
      model: modelPath,
      n_ctx: 2048,
      n_batch: 512,
      n_threads: 2,
    },
    (progress: number) => onProgress?.(Math.round(progress * 100)),
  );
  _activeModelId = modelId;
  onProgress?.(100);
}

/**
 * Generate a creature response using the loaded on-device LLM.
 * Falls back to templates if no model is loaded.
 */
export async function generateResponse(
  creature: CreatureState,
  userMessage: string,
  conversationHistory: { role: string; content: string }[] = [],
): Promise<string> {
  if (!_context) {
    const { generateTemplateResponse } = await import('./ModelManager');
    return generateTemplateResponse(creature, userMessage);
  }

  const prompt = buildLLMPrompt(creature, conversationHistory, userMessage);

  // Serialize access to the llama context — only one inference at a time
  while (_inferenceLock) {
    await new Promise(r => setTimeout(r, 100));
  }
  _inferenceLock = true;

  try {
    const result = await _context.completion({
      messages: [{ role: 'user', content: prompt }],
      n_predict: 120,
      temperature: 0.8,
      top_p: 0.9,
    });
    _inferenceLock = false;
    const text = result.text?.trim();
    if (text) return cleanResponse(text);
  } catch (e) {
    _inferenceLock = false;
    console.warn('[AIService] LLM inference failed:', e);
  }

  const { generateTemplateResponse } = await import('./ModelManager');
  return generateTemplateResponse(creature, userMessage);
}

export function generateInternalThought(creature: CreatureState): string {
  const mood = creature.personality.mood;
  const thoughts: Record<string, string[]> = {
    happy: ['Everything feels so bright today! ☆', 'I wonder what we\'ll do next…'],
    hungry: ['Mmm… I could really go for a snack right now.', 'My tummy is making strange sounds…'],
    sad: ['I hope my human still likes me…', 'Maybe I should try harder…'],
    sleepy: ['zZz… so cozy…', 'Just five more minutes…'],
    mischief: ['Hehe, I have an idea… ☆', 'What if I rearranged everything while they\'re not looking?'],
  };
  const moodThoughts = thoughts[mood] ?? ['*contemplating existence*'];
  return moodThoughts[Math.floor(Math.random() * moodThoughts.length)]!;
}

function cleanResponse(text: string): string {
  return text
    .replace(/^["']|["']$/g, '')
    .replace(/^(\*[^*]+\*)\s*\1/, '$1')
    .trim();
}
