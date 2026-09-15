/**
 * Model Catalog — Curated list of GGUF models for on-device inference.
 *
 * Each entry includes download URLs, recommended configs, and
 * compatibility info. Users pick from these in the app's Model Manager.
 */

import type { ModelMetadata, ModelConfig } from '../types/creature';

// ──────────────────────────────────────────────────────────────
// Default Config Presets
// ──────────────────────────────────────────────────────────────

const ULTRA_FAST: ModelConfig = {
  contextSize: 1024,
  threads: 2,
  gpuLayers: 0,
  temperature: 0.9,
  topP: 0.95,
  topK: 40,
  repeatPenalty: 1.1,
};

const FAST: ModelConfig = {
  contextSize: 2048,
  threads: 4,
  gpuLayers: 16,
  temperature: 0.8,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
};

const BALANCED: ModelConfig = {
  contextSize: 2048,
  threads: 4,
  gpuLayers: 27,
  temperature: 0.8,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
};

const QUALITY: ModelConfig = {
  contextSize: 2048,
  threads: 4,
  gpuLayers: 33,
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.15,
};

// ──────────────────────────────────────────────────────────────
// Catalog
//
// Every downloadable entry carries the SHA-256 of the exact upstream
// artifact. Downloads are verified against it before the file is handed to
// llama.cpp (see services/creature/integrity.ts). `sizeMb` is the real
// artifact size in MiB, not an estimate.
//
// The OpenELM entry that used to live here was removed: Apple's
// OpenELM-270M-Instruct-GGUF file no longer exists upstream (404), so the
// entry could never have downloaded.
// ──────────────────────────────────────────────────────────────

export const MODEL_CATALOG: ModelMetadata[] = [
  // ── Tier 1: Recommended ────────────────────────
  {
    id: 'smollm2-135m-q4km',
    name: 'SmolLM2 135M (Q4_K_M)',
    description: 'Tiniest model. Runs on anything. Snappy responses. Good for older phones or users who prefer quick, short chats.',
    url: 'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf',
    sizeMb: 101,
    minRamMb: 256,
    checksumSha256: '2e8040ceae7815abe0dcb3540b9995eaa1fa0d2ca9e797d0a635ae4433c68c2d',
    architecture: 'llama',
    recommendedConfig: ULTRA_FAST,
    tier: 1,
  },
  {
    id: 'smollm2-360m-q4km',
    name: 'SmolLM2 360M (Q4_K_M) ⭐ DEFAULT',
    description: 'Best size-to-quality ratio. Coherent personality, good emotional range. Fits on virtually any phone. Recommended for most users.',
    url: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf',
    sizeMb: 258,
    minRamMb: 512,
    checksumSha256: '2fa3f013dcdd7b99f9b237717fa0b12d75bbb89984cc1274be1471a465bac9c2',
    architecture: 'llama',
    recommendedConfig: FAST,
    tier: 1,
  },
  {
    id: 'qwen2.5-0.5b-q4km',
    name: 'Qwen2.5 0.5B Instruct (Q4_K_M)',
    description: 'Surprisingly smart for 0.5B. Excellent at following instructions. Good for users who want richer conversations with slightly slower responses.',
    url: 'https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf',
    sizeMb: 379,
    minRamMb: 768,
    checksumSha256: '6eb923e7d26e9cea28811e1a8e852009b21242fb157b26149d3b188f3a8c8653',
    architecture: 'qwen2',
    recommendedConfig: BALANCED,
    tier: 1,
  },

  // ── Tier 2: Good Alternatives ──────────────────
  {
    id: 'tinyllama-1.1b-q4km',
    name: 'TinyLlama 1.1B Chat (Q4_K_M)',
    description: 'Real personality depth. Good long-term coherence. Needs ~1.5GB free RAM — best for flagship phones.',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    sizeMb: 638,
    minRamMb: 1536,
    checksumSha256: '9fecc3b3cd76bba89d504f29b616eedf7da85b96540e490ca5824d3f7d2776a0',
    architecture: 'llama',
    recommendedConfig: QUALITY,
    tier: 2,
  },
  {
    id: 'gemma-2-2b-q4km',
    name: 'Gemma 2 2B (Q4_K_M)',
    description: 'Excellent conversation quality. Gemma architecture handles personality prompts particularly well. iPhone 15 Pro / Pixel 8+ recommended.',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    sizeMb: 1629,
    minRamMb: 3072,
    checksumSha256: 'e0aee85060f168f0f2d8473d7ea41ce2f3230c1bc1374847505ea599288a7787',
    architecture: 'gemma2',
    recommendedConfig: QUALITY,
    tier: 2,
  },

  // ── Tier 3: Experimental ───────────────────────
  {
    id: 'stablelm-zephyr-3b-q3km',
    name: 'StableLM Zephyr 3B (Q3_K_M)',
    description: 'Great personality, very chatty. Zephyr tuning makes it naturally conversational. Very slow on all but the fastest phones. Flagship only.',
    url: 'https://huggingface.co/TheBloke/stablelm-zephyr-3b-GGUF/resolve/main/stablelm-zephyr-3b.Q3_K_M.gguf',
    sizeMb: 1327,
    minRamMb: 4096,
    checksumSha256: '02b545787cb84b6f3a41366bf3803cbf4e86d010589a6d494beb55da51ceb42b',
    architecture: 'stablelm',
    recommendedConfig: QUALITY,
    tier: 3,
  },
];

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** Get model by ID */
export function getModelById(id: string): ModelMetadata | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

/** Get the default recommended model */
export function getDefaultModel(): ModelMetadata {
  return MODEL_CATALOG[1]!; // SmolLM2 360M
}

/** Get models compatible with a given RAM budget */
export function getModelsByRamBudget(ramMb: number): ModelMetadata[] {
  return MODEL_CATALOG.filter((m) => m.minRamMb <= ramMb);
}

/** Get models by tier */
export function getModelsByTier(tier: 1 | 2 | 3): ModelMetadata[] {
  return MODEL_CATALOG.filter((m) => m.tier === tier);
}

/** Format model size for display */
export function formatModelSize(sizeMb: number): string {
  if (sizeMb >= 1000) return `${(sizeMb / 1000).toFixed(1)} GB`;
  return `${sizeMb} MB`;
}

/** Estimate tokens per second on a given device */
export function estimateSpeed(modelId: string, deviceRamMb: number): string {
  const model = getModelById(modelId);
  if (!model) return 'Unknown';

  const baseSpeed = model.sizeMb < 200 ? 45 : model.sizeMb < 400 ? 25 : model.sizeMb < 800 ? 12 : 5;
  const ramFactor = deviceRamMb > model.minRamMb * 1.5 ? 1.2 : 1.0;

  const speed = Math.round(baseSpeed * ramFactor);
  if (speed >= 20) return `${speed} tok/s (fast)`;
  if (speed >= 8) return `${speed} tok/s (good)`;
  return `${speed} tok/s (slow)`;
}
