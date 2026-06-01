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
// ──────────────────────────────────────────────────────────────

export const MODEL_CATALOG: ModelMetadata[] = [
  // ── Tier 1: Recommended ────────────────────────
  {
    id: 'smollm2-135m-q4km',
    name: 'SmolLM2 135M (Q4_K_M)',
    description: 'Tiniest model. Runs on anything. Snappy responses. Good for older phones or users who prefer quick, short chats.',
    url: 'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf',
    sizeMb: 90,
    minRamMb: 256,
    checksumSha256: '', // TODO: add checksums for all models
    architecture: 'llama',
    recommendedConfig: ULTRA_FAST,
  },
  {
    id: 'smollm2-360m-q4km',
    name: 'SmolLM2 360M (Q4_K_M) ⭐ DEFAULT',
    description: 'Best size-to-quality ratio. Coherent personality, good emotional range. Fits on virtually any phone. Recommended for most users.',
    url: 'https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf',
    sizeMb: 240,
    minRamMb: 512,
    checksumSha256: '',
    architecture: 'llama',
    recommendedConfig: FAST,
  },
  {
    id: 'qwen2.5-0.5b-q4km',
    name: 'Qwen2.5 0.5B Instruct (Q4_K_M)',
    description: 'Surprisingly smart for 0.5B. Excellent at following instructions. Good for users who want richer conversations with slightly slower responses.',
    url: 'https://huggingface.co/bartowski/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf',
    sizeMb: 350,
    minRamMb: 768,
    checksumSha256: '',
    architecture: 'qwen2',
    recommendedConfig: BALANCED,
  },

  // ── Tier 2: Good Alternatives ──────────────────
  {
    id: 'tinyllama-1.1b-q4km',
    name: 'TinyLlama 1.1B Chat (Q4_K_M)',
    description: 'Real personality depth. Good long-term coherence. Needs ~1.5GB free RAM — best for flagship phones.',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    sizeMb: 700,
    minRamMb: 1536,
    checksumSha256: '',
    architecture: 'llama',
    recommendedConfig: QUALITY,
  },
  {
    id: 'gemma-2-2b-q4km',
    name: 'Gemma 2 2B (Q4_K_M)',
    description: 'Excellent conversation quality. Gemma architecture handles personality prompts particularly well. iPhone 15 Pro / Pixel 8+ recommended.',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/main/gemma-2-2b-it-Q4_K_M.gguf',
    sizeMb: 1400,
    minRamMb: 3072,
    checksumSha256: '',
    architecture: 'gemma2',
    recommendedConfig: QUALITY,
  },

  // ── Tier 3: Experimental ───────────────────────
  {
    id: 'openelm-270m-q4km',
    name: 'OpenELM 270M Instruct (Q4_K_M)',
    description: 'Apple-designed for on-device. Great on Apple Silicon but finicky prompt format. Experimental support.',
    url: 'https://huggingface.co/apple/OpenELM-270M-Instruct/resolve/main/OpenELM-270M-Instruct-Q4_K_M.gguf',
    sizeMb: 180,
    minRamMb: 384,
    checksumSha256: '',
    architecture: 'llama',
    recommendedConfig: FAST,
  },
  {
    id: 'stablelm-zephyr-3b-q3km',
    name: 'StableLM Zephyr 3B (Q3_K_M)',
    description: 'Great personality, very chatty. Zephyr tuning makes it naturally conversational. Very slow on all but the fastest phones. Flagship only.',
    url: 'https://huggingface.co/TheBloke/stablelm-zephyr-3b-GGUF/resolve/main/stablelm-zephyr-3b.Q3_K_M.gguf',
    sizeMb: 1800,
    minRamMb: 4096,
    checksumSha256: '',
    architecture: 'stablelm',
    recommendedConfig: QUALITY,
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
  const startIndex = tier === 1 ? 0 : tier === 2 ? 3 : 6;
  const counts = [3, 2, 2] as const;
  const count = counts[tier - 1] ?? 0;
  return MODEL_CATALOG.slice(startIndex, startIndex + count);
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
