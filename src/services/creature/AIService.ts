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
import { MODELS, buildSystemPrompt, type ModelInfo } from './ModelManager';
import { verifyFileSha256 } from './integrity';

// ──────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────

let _context: LlamaContext | null = null;
let _activeModelId = '';
const _downloadedModels = new Map<string, string>();
let _inferenceLock = false; // serialize llama context access // modelId -> filePath

/**
 * How long a download may deliver no new bytes before we treat it as stalled.
 * Model files are hundreds of megabytes, so a slow-but-alive transfer is
 * normal; a transfer with no progress at all for this long is not.
 */
const DOWNLOAD_STALL_TIMEOUT_MS = 45_000;

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

/** Models present on disk, after hydrateDownloadedModels() has run. */
export function getDownloadedModelIds(): string[] {
  return [..._downloadedModels.keys()];
}

/** The model actually answering right now, or null for the built-in engine. */
export function getLoadedModelId(): string | null {
  return _context ? _activeModelId : null;
}

/** Where a model's file lives. The id is the filename, so this needs no state. */
function modelFilePath(modelId: string): string {
  return `${RNFS.DocumentDirectoryPath}/models/${modelId}.gguf`;
}

/**
 * Populate the downloaded-model map from the filesystem.
 *
 * The map is in-memory, so after an app restart it was empty: the picker showed
 * a previously downloaded model as though it had never been fetched, and the
 * creature's model could not be found to load. The files are the truth; ask
 * them instead of a variable.
 */
export async function hydrateDownloadedModels(): Promise<string[]> {
  const found: string[] = [];
  for (const model of MODELS) {
    if (!model.url) continue;
    const path = modelFilePath(model.id);
    try {
      if (await RNFS.exists(path)) {
        _downloadedModels.set(model.id, path);
        found.push(model.id);
      }
    } catch {
      // An unreadable path is simply not a model we can use.
    }
  }
  return found;
}

/**
 * Reload the model a creature was created with, after an app restart.
 *
 * Without this the chat silently fell back to the built-in template engine on
 * every launch — the model was only ever loaded inside the create flow, so a
 * user who chose a 0.7 GB model got canned one-liners from then on, with no
 * indication anything was wrong.
 */
export async function restoreLoadedModel(modelId: string): Promise<boolean> {
  if (!modelId || modelId === 'apple-ondevice') return false;
  if (_context) return true;

  const path = modelFilePath(modelId);
  try {
    if (!(await RNFS.exists(path))) return false;
    _downloadedModels.set(modelId, path);
    await loadModel(path, modelId);
    return true;
  } catch (err) {
    // Not fatal: the creature still talks, just from the template engine.
    console.warn('[AIService] could not restore the saved model:', err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Engine-change notifications
// ──────────────────────────────────────────────────────────────
//
// Chat replies come from the LLM when one is loaded and from the built-in
// template engine when it is not, and the two are indistinguishable to a user —
// which is how a silently degraded engine went unnoticed. Screens subscribe so
// they can say which one is answering.

type EngineListener = (modelId: string | null) => void;
const _engineListeners = new Set<EngineListener>();

/** Notified with the model that is answering, or null for the built-in engine. */
export function onEngineChange(listener: EngineListener): () => void {
  _engineListeners.add(listener);
  return () => {
    _engineListeners.delete(listener);
  };
}

function _notifyEngine(): void {
  const loaded = getLoadedModelId();
  for (const listener of _engineListeners) listener(loaded);
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
  const destPath = modelFilePath(modelId);

  // A file that already exists is NOT assumed good — it is verified below,
  // because an interrupted download also leaves a file behind.
  const exists = await RNFS.exists(destPath);
  if (!exists) {
    let lastBytes = 0;
    let lastProgressAt = Date.now();
    let stallTimer: ReturnType<typeof setInterval> | null = null;

    const { promise, jobId } = RNFS.downloadFile({
      fromUrl: model.url,
      toFile: destPath,
      progress: (res) => {
        if (res.bytesWritten !== lastBytes) {
          lastBytes = res.bytesWritten;
          lastProgressAt = Date.now();
        }
        if (res.contentLength > 0) {
          const pct = Math.round((res.bytesWritten / res.contentLength) * 100);
          onProgress?.(Math.min(100, pct), 'download');
        }
      },
      progressDivider: 10,
    });

    try {
      // CFNetwork can stall mid-transfer without ever failing: the bytes just
      // stop arriving and the resource timeout is an hour, so the UI would sit
      // at "downloading… 0%" indefinitely. Seen in practice when the redirect
      // to Hugging Face's CDN hangs during TLS. Watch for a lack of progress
      // and turn that into a real, actionable error instead.
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          stallTimer = setInterval(() => {
            if (Date.now() - lastProgressAt >= DOWNLOAD_STALL_TIMEOUT_MS) {
              if (stallTimer) clearInterval(stallTimer);
              RNFS.stopDownload(jobId);
              reject(
                new Error(
                  `Download stalled: no data received for ${Math.round(
                    DOWNLOAD_STALL_TIMEOUT_MS / 1000,
                  )}s. Check your connection and try again.`,
                ),
              );
            }
          }, 5000);
        }),
      ]);

      if (result.statusCode !== 200) {
        await RNFS.unlink(destPath).catch(() => {});
        throw new Error(`Download failed: ${result.statusCode}`);
      }
    } finally {
      if (stallTimer) clearInterval(stallTimer);
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
  await verifyFileSha256(
    path,
    model.sha256,
    {
      stat: (filePath) => RNFS.stat(filePath).then((s) => ({ size: Number(s.size) || 0 })),
      // Native CommonCrypto digest — see patches/react-native-fs+2.20.0.patch.
      // A JS-side hash of the same file took minutes on device.
      digest: (filePath) => RNFS.hash(filePath, 'sha256'),
    },
    {
      // Catches a truncated download in milliseconds, before hashing.
      expectedBytes: model.sizeBytes || undefined,
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
      // Two threads on a 6-core phone needlessly halves generation speed.
      n_threads: 4,
    },
    (progress: number) => onProgress?.(Math.round(progress * 100)),
  );
  _activeModelId = modelId;
  _notifyEngine();
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

  const systemPrompt = buildSystemPrompt(creature);

  // These roles are the whole ballgame. The GGUF carries TinyLlama's own
  // Zephyr chat template, and llama.rn applies it to this array to produce
  // <|system|> / <|user|> / <|assistant|> turns.
  //
  // The previous version collapsed everything into ONE user message and added
  // hand-written "USER:" / "ASSISTANT:" markers. The model therefore never saw
  // a system turn; it just saw text that looked like a dialogue transcript and
  // continued the pattern — inventing conversation partners, addressing itself
  // by name ("PIXEL: I'm not a human.") and emitting garbage tokens. It was
  // completing, not answering.
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-8).map((m) => ({
      role: m.role === 'creature' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
      content: m.content,
    })) as { role: 'system' | 'user' | 'assistant'; content: string }[],
    { role: 'user', content: userMessage },
  ];

  // Serialize access to the llama context
  while (_inferenceLock) {
    await new Promise(r => setTimeout(r, 100));
  }
  _inferenceLock = true;

  try {
    const result = await _context.completion({
      messages,
      // TinyLlama's GGUF carries a Jinja chat template. Without this flag
      // llama.rn falls back to llama.cpp's legacy formatter, which only
      // recognises a fixed set of template shapes — with a system turn the
      // creature's whole personality can be dropped on the floor, leaving the
      // model to answer as a generic assistant.
      jinja: true,
      // The creature is meant to speak 1-3 sentences. 256 tokens invited long
      // monologues that ran straight past the end of the turn.
      n_predict: 120,
      temperature: 0.7,
      top_p: 0.9,
      // A 1.1B model repeats itself readily; its instruct tuning assumes a
      // repetition penalty.
      penalty_repeat: 1.15,
      // Belt and braces: even with the right template, tiny models sometimes
      // keep going and write both sides of the exchange.
      stop: [
        '<|user|>',
        '<|assistant|>',
        '<|system|>',
        '</s>',
        'Owner:',
        'OWNER:',
        'USER:',
        'ASSISTANT:',
        '<|eot_id|>',
        '<|start_header_id|>',
      ],
    });
    _inferenceLock = false;
    const text = result.text?.trim();
    if (text) return cleanResponse(text, creature.name);
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

function cleanResponse(text: string, creatureName?: string): string {
  let cleaned = text
    .replace(/^["']|["']$/g, '')
    .replace(/^(\*[^*]+\*)\s*\1/, '$1')
    .trim();

  // Small models like to open with a speaker label, copying the shape of the
  // conversation they were shown — TinyLlama replied "PixeL: I don't eat
  // anything." on the exact prompt that made Llama-3.2 answer in character.
  // That is scaffolding, not dialogue, so drop it.
  const labels = ['owner', 'human', 'user', 'assistant', 'you', 'system', 'creature'];
  if (creatureName) labels.push(creatureName.toLowerCase());
  const labelPattern = new RegExp(`^(${labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*[:\\-]\\s+`, 'i');
  cleaned = cleaned.replace(labelPattern, '').trim();

  // The prompt asks for feelings in words rather than stage directions, and
  // models emit them anyway ("Oooh, I feel hurt. *whine*"). Asking is not
  // enough; strip them so they never reach the user.
  cleaned = cleaned
    .replace(/\*[^*]{1,60}\*/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.!?,])/g, '$1')
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
