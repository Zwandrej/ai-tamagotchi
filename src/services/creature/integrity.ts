/**
 * Integrity — SHA-256 verification for downloaded model files.
 *
 * Model files are 0.6 GB – 1.7 GB binaries fetched over the network, so a
 * truncated or corrupted download is a real failure mode: llama.cpp will fail
 * to load the file, or worse, misbehave. Every downloadable model therefore
 * carries the SHA-256 of the exact upstream artifact, and the file is hashed
 * after download and before it is ever handed to the inference engine.
 *
 * Hashing is native (RNFS.hash → CommonCrypto). Doing it in JavaScript means
 * base64-decoding ~1.3 GB per gigabyte of model and then running a pure-JS
 * SHA-256 over the result; measured on a simulator, a 638 MB model was still
 * hashing after four minutes at 99% CPU. See
 * patches/react-native-fs+2.20.0.patch — upstream's one-shot implementation
 * read the whole file into a single NSData to hash it, which for a 1.7 GB
 * model either failed to allocate (hashing an empty buffer and reporting a
 * false mismatch) or tripped the jetsam limit.
 *
 * This module is deliberately pure TypeScript with the platform primitives
 * injected, so the decision logic can be unit tested in Jest — there is no
 * Xcode or simulator in the test path.
 */

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

export function isSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

// ──────────────────────────────────────────────────────────────
// Verification
// ──────────────────────────────────────────────────────────────

/**
 * The platform primitives this module needs. On device these are RNFS.stat
 * and RNFS.hash; in tests they are fakes.
 */
export interface FileProbe {
  /** Size in bytes as reported by the filesystem. */
  stat(path: string): Promise<{ size: number }>;
  /** Lowercase hex SHA-256 of the file's bytes. */
  digest(path: string): Promise<string>;
}

export interface VerifyResult {
  verified: boolean;
  sha256: string;
  bytes: number;
}

export interface VerifyOptions {
  /**
   * Size the file should have. Checked before hashing so a truncated
   * download fails in milliseconds rather than after a full hash pass.
   */
  expectedBytes?: number;
  onProgress?: (pct: number) => void;
}

/**
 * Hash a file and compare it with the expected digest.
 *
 * Resolves with the digest when the file matches. Throws IntegrityError when
 * it does not — the caller must delete the file, never keep it.
 *
 * An empty `expectedSha256` means the model has no published checksum; the
 * file is still hashed (so callers can log it) and returned as unverified,
 * because an unverified "yes" would be worse than an honest "unknown".
 */
export async function verifyFileSha256(
  path: string,
  expectedSha256: string,
  probe: FileProbe,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const expected = expectedSha256.trim().toLowerCase();

  // A malformed digest must never be treated as "no checksum": that is how a
  // typo silently disables verification altogether.
  if (expected && !isSha256Hex(expected)) {
    throw new IntegrityError(
      `Refusing to verify ${path} against a malformed digest: "${expectedSha256}"`,
      path,
      expectedSha256,
      '',
    );
  }

  const { size } = await probe.stat(path);

  if (options.expectedBytes != null && size !== options.expectedBytes) {
    throw new IntegrityError(
      `Size mismatch for ${path}: expected ${options.expectedBytes} bytes, found ${size}`,
      path,
      String(options.expectedBytes),
      String(size),
    );
  }

  options.onProgress?.(50);
  const actual = (await probe.digest(path)).trim().toLowerCase();
  options.onProgress?.(100);

  if (!expected) {
    return { verified: false, sha256: actual, bytes: size };
  }

  if (actual !== expected) {
    throw new IntegrityError(
      `Checksum mismatch for ${path}: expected ${expected}, got ${actual}`,
      path,
      expected,
      actual,
    );
  }

  return { verified: true, sha256: actual, bytes: size };
}
