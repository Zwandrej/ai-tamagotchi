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
import { verifyFileSha256 } from './integrity';

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
  onProgress?: (pct: number, phase: 'download' | 'verify') => void,
): Promise<string> {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);
  if (!model.url) throw new Error(`${model.name} requires no download`);

  // Already downloaded and verified in this session
  if (_downloadedModels.has(modelId)) {
    onProgress?.(100, 'download');
    return _downloadedModels.get(modelId)!;
  }

  const dir = `${RNFS.DocumentDirectoryPath}/models`;
  await RNFS.mkdir(dir);
  const filename = `${modelId}.gguf`;
  const destPath = `${dir}/${filename}`;

  // A file that already exists is NOT assumed good — it is verified below,
  // because an interrupted download also leaves a file behind.
  const exists = await RNFS.exists(destPath);
  if (!exists) {
    const { promise } = RNFS.downloadFile({
      fromUrl: model.url,
      toFile: destPath,
      progress: (res) => {
        if (res.contentLength > 0) {
          const pct = Math.round((res.bytesWritten / res.contentLength) * 100);
          onProgress?.(Math.min(100, pct), 'download');
        }
      },
      progressDivider: 10,
    });

    const result = await promise;
    if (result.statusCode !== 200) {
      await RNFS.unlink(destPath).catch(() => {});
      throw new Error(`Download failed: ${result.statusCode}`);
    }
  }

  // Trust nothing until the digest matches the published one.
  try {
    await verifyModelFile(destPath, model, onProgress);
  } catch (err) {
    await RNFS.unlink(destPath).catch(() => {});
    throw err;
  }

  _downloadedModels.set(modelId, destPath);
  onProgress?.(100, 'download');
  return destPath;
}

/**
 * Hash a downloaded model file and compare it against the catalog digest.
 * Throws IntegrityError on mismatch — the caller deletes the file.
 */
async function verifyModelFile(
  path: string,
  model: ModelInfo,
  onProgress?: (pct: number, phase: 'download' | 'verify') => void,
): Promise<void> {
  let totalBytes = 0;
  try {
    const stat = await RNFS.stat(path);
    totalBytes = Number(stat.size) || 0;
  } catch {
    // Progress reporting only — hashing works without a known total size.
  }

  await verifyFileSha256(
    path,
    model.sha256,
    (filePath, position, length) => RNFS.read(filePath, length, position, 'base64'),
    {
      totalBytes,
      onProgress: (pct) => onProgress?.(pct, 'verify'),
    },
  );
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

  const systemPrompt = buildLLMPrompt(creature, conversationHistory, userMessage);

  // For Llama 3.2 1B, combine system prompt with user message
  // in a single turn. Multi-role chat often confuses small models.
  const combined = `${systemPrompt}\n\nUSER: ${userMessage}\n\nASSISTANT:`;

  // Serialize access to the llama context
  while (_inferenceLock) {
    await new Promise(r => setTimeout(r, 100));
  }
  _inferenceLock = true;

  try {
    const result = await _context.completion({
      // @ts-ignore
      messages: [{ role: 'user', content: combined }],
      n_predict: 256,
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
  let cleaned = text
    .replace(/^["']|["']$/g, '')
    .replace(/^(\*[^*]+\*)\s*\1/, '$1')
    .trim();

  // If response looks truncated (no sentence-ending punctuation near the end),
  // trim back to the last complete sentence boundary
  if (!cleaned.match(/[.!?]["'\u201d\u2019]*\s*$/)) {
    const lastSentenceEnd = Math.max(
      cleaned.lastIndexOf('.'),
      cleaned.lastIndexOf('!'),
      cleaned.lastIndexOf('?'),
    );
    if (lastSentenceEnd > cleaned.length * 0.4 && lastSentenceEnd > 10) {
      cleaned = cleaned.substring(0, lastSentenceEnd + 1);
    }
  }

  return cleaned;
}
