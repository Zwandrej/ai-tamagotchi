/**
 * Integrity — SHA-256 verification for downloaded model files.
 *
 * Model files are 90 MB – 1.8 GB binaries fetched over the network, so a
 * truncated or corrupted download is a real failure mode: llama.cpp will fail
 * to load the file, or worse, misbehave. Every downloadable model therefore
 * carries the SHA-256 of the exact upstream artifact, and the file is hashed
 * after download and before it is ever handed to the inference engine.
 *
 * This module is deliberately pure TypeScript with no native dependency, so
 * it can be unit tested in Jest (there is no Xcode/simulator in the test
 * path). The caller injects the file reader; on device that reader is RNFS.
 */

import { sha256 } from '@noble/hashes/sha256';

// ──────────────────────────────────────────────────────────────
// Errors
// ──────────────────────────────────────────────────────────────

export class IntegrityError extends Error {
  readonly path: string;
  readonly expected: string;
  readonly actual: string;

  constructor(message: string, path: string, expected: string, actual: string) {
    super(message);
    this.name = 'IntegrityError';
    this.path = path;
    this.expected = expected;
    this.actual = actual;
  }
}

// ──────────────────────────────────────────────────────────────
// Hex
// ──────────────────────────────────────────────────────────────

const HEX = '0123456789abcdef';

export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    out += HEX[b >> 4]! + HEX[b & 0x0f]!;
  }
  return out;
}

export function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

// ──────────────────────────────────────────────────────────────
// Base64
// ──────────────────────────────────────────────────────────────
//
// react-native-fs can only hand back binary file content as base64, and
// Hermes has no atob(). This decoder handles standard base64 with padding
// and tolerates the newlines RNFS may insert on long reads.

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const B64_LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64_ALPHABET.length; i++) table[B64_ALPHABET.charCodeAt(i)] = i;
  return table;
})();

export function base64ToBytes(base64: string): Uint8Array {
  const out = new Uint8Array(Math.floor((base64.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let written = 0;

  for (let i = 0; i < base64.length; i++) {
    const code = base64.charCodeAt(i);

    // Padding ends the payload
    if (code === 61 /* '=' */) break;

    // Skip whitespace (RNFS can wrap long base64 reads)
    if (code === 10 || code === 13 || code === 32 || code === 9) continue;

    const value = code < 128 ? B64_LOOKUP[code]! : -1;
    if (value < 0) {
      throw new Error(`Invalid base64 character at index ${i}`);
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      out[written++] = (buffer >> bits) & 0xff;
    }
  }

  return out.subarray(0, written);
}

// ──────────────────────────────────────────────────────────────
// Streaming SHA-256
// ──────────────────────────────────────────────────────────────

export interface Hasher {
  update(chunk: Uint8Array): void;
  digestHex(): string;
}

export function createHasher(): Hasher {
  const stream = sha256.create();
  return {
    update(chunk: Uint8Array) {
      stream.update(chunk);
    },
    digestHex() {
      return bytesToHex(stream.digest());
    },
  };
}

/** One-shot convenience — hashes a whole buffer. */
export function sha256Hex(bytes: Uint8Array): string {
  return bytesToHex(sha256(bytes));
}

// ──────────────────────────────────────────────────────────────
// File verification
// ──────────────────────────────────────────────────────────────

/**
 * Reads a slice of a file and returns it base64-encoded.
 * Provided by the platform layer (RNFS.read on device).
 */
export type ChunkReader = (
  path: string,
  position: number,
  length: number,
) => Promise<string>;

export interface VerifyResult {
  verified: boolean;
  sha256: string;
  bytes: number;
}

export interface VerifyOptions {
  /** Read size per chunk. 4 MB keeps peak memory flat on large models. */
  chunkSize?: number;
  onProgress?: (pct: number) => void;
  /**
   * Total file size in bytes, used only to report progress. Truncation does
   * not need a separate check: a short file cannot match the digest.
   */
  totalBytes?: number;
}

const DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * Hash a file and compare it with the expected digest.
 *
 * Resolves with the digest when the file matches. Throws IntegrityError when
 * it does not — the caller must delete the file, not keep it.
 *
 * An empty `expectedSha256` means the model has no published checksum; the
 * file is hashed anyway (so callers can log it) and returned as unverified.
 */
export async function verifyFileSha256(
  path: string,
  expectedSha256: string,
  read: ChunkReader,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const expected = expectedSha256.trim().toLowerCase();
  const hasher = createHasher();

  let position = 0;
  let bytes = 0;
  let lastReported = -1;

  for (;;) {
    let chunk: string;
    try {
      chunk = await read(path, position, chunkSize);
    } catch (err) {
      // Reading past the end of a file is how some readers signal EOF.
      if (bytes > 0) break;
      throw err;
    }

    if (!chunk) break;

    const slice = base64ToBytes(chunk);
    if (slice.length === 0) break;

    hasher.update(slice);
    bytes += slice.length;
    position += slice.length;

    if (options.onProgress && options.totalBytes) {
      const pct = Math.min(99, Math.floor((bytes / options.totalBytes) * 100));
      if (pct !== lastReported) {
        lastReported = pct;
        options.onProgress(pct);
      }
    }

    // A short read means we reached the end of the file.
    if (slice.length < chunkSize) break;
  }

  const actual = hasher.digestHex();
  options.onProgress?.(100);

  if (!expected) {
    return { verified: false, sha256: actual, bytes };
  }

  if (actual !== expected) {
    throw new IntegrityError(
      `Checksum mismatch for ${path}: expected ${expected}, got ${actual}`,
      path,
      expected,
      actual,
    );
  }

  return { verified: true, sha256: actual, bytes };
}
