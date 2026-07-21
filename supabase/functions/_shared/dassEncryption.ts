export interface DassScores {
  depression: number;
  anxiety: number;
  stress: number;
}

export interface DassCryptoContext {
  recordId: string;
  coupleId: string;
  submittedBy: string;
  keyVersion: string;
}

export interface DassEncryptedPayload {
  ciphertext: string;
  ciphertextIv: string;
  wrappedDataKey: string;
  wrappedDataKeyIv: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function additionalData(
  context: DassCryptoContext,
  purpose: 'payload' | 'dek',
): Uint8Array {
  return encoder.encode(
    `tahanan:dass-monitoring:v1:${purpose}:${context.recordId}:${context.coupleId}:${context.submittedBy}:${context.keyVersion}`,
  );
}

async function importAesGcmKey(
  rawKey: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  if (rawKey.byteLength !== 32) {
    throw new Error('AES-256-GCM keys must be 32 bytes');
  }

  return crypto.subtle.importKey(
    'raw',
    toArrayBuffer(rawKey),
    { name: 'AES-GCM' },
    false,
    usages,
  );
}

async function encryptBytes(
  plaintext: Uint8Array,
  rawKey: Uint8Array,
  aad: Uint8Array,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(aad),
      tagLength: 128,
    },
    await importAesGcmKey(rawKey, ['encrypt']),
    toArrayBuffer(plaintext),
  );
  return { ciphertext: new Uint8Array(ciphertext), iv };
}

async function decryptBytes(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  rawKey: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(aad),
      tagLength: 128,
    },
    await importAesGcmKey(rawKey, ['decrypt']),
    toArrayBuffer(ciphertext),
  );
  return new Uint8Array(plaintext);
}

function validateScores(value: unknown): DassScores {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid encrypted DASS score payload');
  }

  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== 'anxiety' ||
    keys[1] !== 'depression' ||
    keys[2] !== 'stress'
  ) {
    throw new Error('Invalid encrypted DASS score payload');
  }

  const scores = [candidate.depression, candidate.anxiety, candidate.stress];
  if (
    !scores.every(
      (score) =>
        typeof score === 'number' &&
        Number.isInteger(score) &&
        score >= 0 &&
        score <= 42,
    )
  ) {
    throw new Error('Invalid encrypted DASS score payload');
  }

  return {
    depression: candidate.depression as number,
    anxiety: candidate.anxiety as number,
    stress: candidate.stress as number,
  };
}

export function kekFromBase64(value: string): Uint8Array {
  const key = fromBase64(value);
  if (key.byteLength !== 32) {
    throw new Error('Vault DASS monitoring KEK must be 32 bytes');
  }
  return key;
}

export async function encryptDassScores(
  scores: DassScores,
  kek: Uint8Array,
  context: DassCryptoContext,
): Promise<DassEncryptedPayload> {
  const validatedScores = validateScores(scores);
  const dataEncryptionKey = randomBytes(32);
  const payload = await encryptBytes(
    encoder.encode(JSON.stringify(validatedScores)),
    dataEncryptionKey,
    additionalData(context, 'payload'),
  );
  const wrappedKey = await encryptBytes(
    dataEncryptionKey,
    kek,
    additionalData(context, 'dek'),
  );

  return {
    ciphertext: toBase64(payload.ciphertext),
    ciphertextIv: toBase64(payload.iv),
    wrappedDataKey: toBase64(wrappedKey.ciphertext),
    wrappedDataKeyIv: toBase64(wrappedKey.iv),
  };
}

export async function decryptDassScores(
  encrypted: DassEncryptedPayload,
  kek: Uint8Array,
  context: DassCryptoContext,
): Promise<DassScores> {
  const dataEncryptionKey = await decryptBytes(
    fromBase64(encrypted.wrappedDataKey),
    fromBase64(encrypted.wrappedDataKeyIv),
    kek,
    additionalData(context, 'dek'),
  );
  const payload = await decryptBytes(
    fromBase64(encrypted.ciphertext),
    fromBase64(encrypted.ciphertextIv),
    dataEncryptionKey,
    additionalData(context, 'payload'),
  );

  return validateScores(JSON.parse(decoder.decode(payload)));
}
