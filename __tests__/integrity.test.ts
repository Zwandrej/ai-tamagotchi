/**
 * Integrity Tests — checksum verification for downloaded model files.
 *
 * These matter because the app hands 90 MB – 1.8 GB downloaded binaries to
 * llama.cpp. A silent corruption there produces a creature that either fails
 * to think or, worse, produces garbage. The file reader is injected, so the
 * whole verification path is testable without a device.
 */

import {
  base64ToBytes,
  bytesToHex,
  createHasher,
  IntegrityError,
  isSha256Hex,
  sha256Hex,
  verifyFileSha256,
  type ChunkReader,
} from '../src/services/creature/integrity';
import { MODEL_CATALOG } from '../src/constants/models';
import { MODELS } from '../src/services/creature/ModelManager';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/** A fake file system entry: bytes + a base64 reader that honours byte offsets. */
function fakeFile(bytes: Uint8Array) {
  const file = {
    bytes,
    reads: 0,
    // Mirrors react-native-fs: `position` and `length` are in BYTES, and the
    // returned chunk is base64-encoded.
    read: async (_path: string, position: number, length: number) => {
      file.reads++;
      if (position >= bytes.length) return '';
      return Buffer.from(bytes.subarray(position, position + length)).toString('base64');
    },
  };
  return file;
}

function bytesOf(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, 'utf8'));
}

// ──────────────────────────────────────────────────────────────
// SHA-256
// ──────────────────────────────────────────────────────────────

describe('sha256', () => {
  it('matches known vectors', () => {
    expect(sha256Hex(new Uint8Array(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex(bytesOf('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex(bytesOf('The quick brown fox jumps over the lazy dog'))).toBe(
      'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    );
  });

  it('streams to the same digest as a one-shot hash', () => {
    const payload = bytesOf('model weights go here'.repeat(1000));
    const hasher = createHasher();
    for (let i = 0; i < payload.length; i += 97) {
      hasher.update(payload.subarray(i, Math.min(i + 97, payload.length)));
    }
    expect(hasher.digestHex()).toBe(sha256Hex(payload));
  });

  it('validates digest shape', () => {
    expect(isSha256Hex('a'.repeat(64))).toBe(true);
    expect(isSha256Hex('A'.repeat(64))).toBe(true);
    expect(isSha256Hex('a'.repeat(63))).toBe(false);
    expect(isSha256Hex('z'.repeat(64))).toBe(false);
    expect(isSha256Hex('')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────
// Base64
// ──────────────────────────────────────────────────────────────

describe('base64ToBytes', () => {
  it('decodes the standard padding cases', () => {
    expect(bytesToHex(base64ToBytes(''))).toBe('');
    expect(bytesToHex(base64ToBytes('Zg=='))).toBe('66');
    expect(bytesToHex(base64ToBytes('Zm8='))).toBe('666f');
    expect(bytesToHex(base64ToBytes('Zm9v'))).toBe('666f6f');
    expect(bytesToHex(base64ToBytes('Zm9vYmFy'))).toBe('666f6f626172');
  });

  it('round-trips arbitrary binary, including every byte value', () => {
    const all = new Uint8Array(256);
    for (let i = 0; i < 256; i++) all[i] = i;
    const encoded = Buffer.from(all).toString('base64');
    expect(bytesToHex(base64ToBytes(encoded))).toBe(bytesToHex(all));
  });

  it('tolerates the whitespace react-native-fs inserts on long reads', () => {
    expect(bytesToHex(base64ToBytes('Zm9v\nYmFy\r\n'))).toBe('666f6f626172');
    expect(bytesToHex(base64ToBytes('Zm9v YmFy'))).toBe('666f6f626172');
  });

  it('rejects characters outside the alphabet', () => {
    expect(() => base64ToBytes('Zm9v!!!')).toThrow(/Invalid base64/);
  });
});

// ──────────────────────────────────────────────────────────────
// File verification
// ──────────────────────────────────────────────────────────────

describe('verifyFileSha256', () => {
  const payload = bytesOf('x'.repeat(10_000));
  const digest = sha256Hex(payload);

  it('accepts a file whose digest matches', async () => {
    const file = fakeFile(payload);
    const result = await verifyFileSha256('/models/tiny.gguf', digest, file.read);
    expect(result.verified).toBe(true);
    expect(result.sha256).toBe(digest);
    expect(result.bytes).toBe(payload.length);
  });

  it('reads a large file in chunks rather than all at once', async () => {
    const file = fakeFile(payload);
    await verifyFileSha256('/models/tiny.gguf', digest, file.read, { chunkSize: 512 });
    expect(file.reads).toBeGreaterThan(10);
  });

  it('rejects a corrupted file and reports both digests', async () => {
    const corrupted = Uint8Array.from(payload);
    corrupted[1234] = 0x00;
    const file = fakeFile(corrupted);

    await expect(verifyFileSha256('/models/tiny.gguf', digest, file.read)).rejects.toThrow(
      IntegrityError,
    );

    try {
      await verifyFileSha256('/models/tiny.gguf', digest, file.read);
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as IntegrityError;
      expect(e.name).toBe('IntegrityError');
      expect(e.expected).toBe(digest);
      expect(e.actual).not.toBe(digest);
      expect(e.path).toBe('/models/tiny.gguf');
    }
  });

  it('rejects a truncated download (prefix of the real file)', async () => {
    const truncated = payload.subarray(0, 4096);
    const file = fakeFile(truncated);
    await expect(verifyFileSha256('/models/tiny.gguf', digest, file.read)).rejects.toThrow(
      /Checksum mismatch/,
    );
  });

  it('compares digests case-insensitively', async () => {
    const file = fakeFile(payload);
    const result = await verifyFileSha256('/models/tiny.gguf', digest.toUpperCase(), file.read);
    expect(result.verified).toBe(true);
  });

  it('hashes but does not claim to verify a model with no published checksum', async () => {
    const file = fakeFile(payload);
    const result = await verifyFileSha256('/models/tiny.gguf', '', file.read);
    expect(result.verified).toBe(false);
    expect(result.sha256).toBe(digest);
  });

  it('handles an empty file without looping', async () => {
    const file = fakeFile(new Uint8Array(0));
    const result = await verifyFileSha256(
      '/models/tiny.gguf',
      sha256Hex(new Uint8Array(0)),
      file.read,
    );
    expect(result.verified).toBe(true);
    expect(result.bytes).toBe(0);
  });

  it('treats a read error after data as end-of-file', async () => {
    const file = fakeFile(payload);
    let calls = 0;
    const read: ChunkReader = async (path, position, length) => {
      calls++;
      if (calls > 2) throw new Error('EOF');
      return file.read(path, position, length);
    };
    await expect(verifyFileSha256('/models/tiny.gguf', digest, read, { chunkSize: 512 })).rejects.toThrow(
      /Checksum mismatch/,
    );
  });

  it('reports progress that ends at 100', async () => {
    const file = fakeFile(payload);
    const seen: number[] = [];
    await verifyFileSha256('/models/tiny.gguf', digest, file.read, {
      chunkSize: 512,
      totalBytes: payload.length,
      onProgress: (pct) => seen.push(pct),
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(Math.max(...seen)).toBe(100);
    expect(seen.every((p) => p >= 0 && p <= 100)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// Catalog hygiene — every downloadable model must be verifiable
// ──────────────────────────────────────────────────────────────

describe('model catalog integrity', () => {
  it('every model with a download URL has a SHA-256 digest', () => {
    for (const model of MODELS) {
      if (model.url) {
        expect(`${model.id}:${model.sha256}`).toMatch(/:[0-9a-f]{64}$/);
      }
    }
  });

  it('every downloadable catalog entry has a SHA-256 digest', () => {
    for (const model of MODEL_CATALOG) {
      expect(`${model.id}:${model.checksumSha256}`).toMatch(/:[0-9a-f]{64}$/);
    }
  });

  it('digests are unique within each catalog', () => {
    const unique = (digests: string[]) => expect(new Set(digests).size).toBe(digests.length);
    unique(MODELS.filter((m) => m.url).map((m) => m.sha256));
    unique(MODEL_CATALOG.map((m) => m.checksumSha256));
  });

  it('both catalogs agree on the digest for a shared artifact', () => {
    const byUrl = new Map(MODELS.filter((m) => m.url).map((m) => [m.url, m.sha256]));
    let shared = 0;
    for (const entry of MODEL_CATALOG) {
      const digest = byUrl.get(entry.url);
      if (digest) {
        shared++;
        expect(`${entry.id}:${entry.checksumSha256}`).toBe(`${entry.id}:${digest}`);
      }
    }
    expect(shared).toBeGreaterThan(0);
  });

  it('no catalog entry points at a known-removed repository', () => {
    for (const model of MODEL_CATALOG) {
      expect(model.url).not.toContain('apple/OpenELM');
    }
  });
});
