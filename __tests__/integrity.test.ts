/**
 * Integrity — verification decision logic.
 *
 * Hashing itself is native (RNFS.hash → CommonCrypto, see
 * patches/react-native-fs+2.20.0.patch), so what is worth testing here is the
 * decision logic around it: when we refuse a file, and — just as important —
 * that we never claim a file is good when it was not actually checked.
 */

import {
  IntegrityError,
  isSha256Hex,
  verifyFileSha256,
  type FileProbe,
} from '../src/services/creature/integrity';

const GOOD_DIGEST = '9fecc3b3cd76bba89d504f29b616eedf7da85b96540e490ca5824d3f7d2776a0';
const OTHER_DIGEST = '6f85a640a97cf2bf5b8e764087b1e83da0fdb51d7c9fab7d0fece9385611df83';
const MODEL_BYTES = 668788096;

function makeProbe(overrides: Partial<{ size: number; digest: string }> = {}) {
  const calls = { stat: 0, digest: 0 };
  const probe: FileProbe = {
    async stat() {
      calls.stat++;
      return { size: overrides.size ?? MODEL_BYTES };
    },
    async digest() {
      calls.digest++;
      return overrides.digest ?? GOOD_DIGEST;
    },
  };
  return { probe, calls };
}

describe('isSha256Hex', () => {
  it('accepts a 64-character hex digest', () => {
    expect(isSha256Hex(GOOD_DIGEST)).toBe(true);
    expect(isSha256Hex(GOOD_DIGEST.toUpperCase())).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isSha256Hex('')).toBe(false);
    expect(isSha256Hex('abc')).toBe(false);
    expect(isSha256Hex(GOOD_DIGEST + 'a')).toBe(false);
    expect(isSha256Hex(GOOD_DIGEST.slice(0, 63) + 'z')).toBe(false);
    // A base64 digest is the classic mistake — it is not hex.
    expect(isSha256Hex('n+zDs81tu6idU...'.padEnd(64, 'A'))).toBe(false);
  });
});

describe('verifyFileSha256', () => {
  it('verifies a file whose digest matches', async () => {
    const { probe } = makeProbe();
    const result = await verifyFileSha256('/models/tinyllama.gguf', GOOD_DIGEST, probe);

    expect(result.verified).toBe(true);
    expect(result.sha256).toBe(GOOD_DIGEST);
    expect(result.bytes).toBe(MODEL_BYTES);
  });

  it('accepts an uppercase expected digest', async () => {
    const { probe } = makeProbe();
    const result = await verifyFileSha256('/m.gguf', GOOD_DIGEST.toUpperCase(), probe);
    expect(result.verified).toBe(true);
  });

  it('throws on a checksum mismatch and reports both digests', async () => {
    const { probe } = makeProbe({ digest: OTHER_DIGEST });

    await expect(verifyFileSha256('/models/phi-2.gguf', GOOD_DIGEST, probe)).rejects.toThrow(
      IntegrityError,
    );

    try {
      await verifyFileSha256('/models/phi-2.gguf', GOOD_DIGEST, probe);
    } catch (err) {
      const e = err as IntegrityError;
      expect(e.expected).toBe(GOOD_DIGEST);
      expect(e.actual).toBe(OTHER_DIGEST);
      expect(e.path).toBe('/models/phi-2.gguf');
      expect(e.message).toContain('Checksum mismatch');
    }
  });

  it('rejects a truncated file on size alone, without hashing it', async () => {
    const { probe, calls } = makeProbe({ size: MODEL_BYTES - 1024 });

    await expect(
      verifyFileSha256('/m.gguf', GOOD_DIGEST, probe, { expectedBytes: MODEL_BYTES }),
    ).rejects.toThrow(/Size mismatch/);

    // The whole point of the size check: a partial download must not cost a
    // full hash pass over hundreds of megabytes.
    expect(calls.digest).toBe(0);
  });

  it('refuses a malformed digest instead of skipping verification', async () => {
    const { probe, calls } = makeProbe();

    await expect(verifyFileSha256('/m.gguf', 'not-a-digest', probe)).rejects.toThrow(
      /malformed digest/,
    );

    // Crucially it must not fall through to "no checksum, therefore fine".
    expect(calls.digest).toBe(0);
  });

  it('reports a file with no published digest as unverified, not as good', async () => {
    const { probe } = makeProbe();
    const result = await verifyFileSha256('/m.gguf', '', probe);

    expect(result.verified).toBe(false);
    expect(result.sha256).toBe(GOOD_DIGEST);
  });

  it('normalises whitespace and case from the platform digest', async () => {
    const { probe } = makeProbe({ digest: `  ${GOOD_DIGEST.toUpperCase()}\n` });
    const result = await verifyFileSha256('/m.gguf', GOOD_DIGEST, probe);
    expect(result.verified).toBe(true);
  });

  it('reports progress that reaches 100', async () => {
    const { probe } = makeProbe();
    const seen: number[] = [];
    await verifyFileSha256('/m.gguf', GOOD_DIGEST, probe, {
      onProgress: (pct) => seen.push(pct),
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBe(100);
  });

  it('propagates a filesystem failure rather than treating it as verified', async () => {
    const probe: FileProbe = {
      async stat() {
        throw new Error('ENOENT: no such file');
      },
      async digest() {
        return GOOD_DIGEST;
      },
    };

    await expect(verifyFileSha256('/gone.gguf', GOOD_DIGEST, probe)).rejects.toThrow(/ENOENT/);
  });
});
