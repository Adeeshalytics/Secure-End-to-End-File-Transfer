/**
 * Browser-side cryptography using the Web Crypto API.
 * The server never receives plaintext, private keys, or raw AES keys.
 *
 * Algorithms:
 *   - AES-256-GCM  : file encryption (confidentiality + integrity)
 *   - RSA-OAEP-SHA256 : AES key wrapping for each recipient
 *   - RSA-PSS-SHA256  : manifest signing (non-repudiation)
 *   - SHA-256          : plaintext/ciphertext integrity hashes
 */

import type { EncryptedPayload, SignedManifest, WrappedFileKey } from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────

function ab2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ab2b64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function b64ToAb(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = data instanceof Uint8Array ? data.buffer : data;
  return ab2hex(await crypto.subtle.digest("SHA-256", buf as ArrayBuffer));
}

function pemToSpki(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "");
  return b64ToAb(b64);
}

function spkiToPem(buffer: ArrayBuffer): string {
  const b64 = ab2b64(buffer);
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

// ── key generation ────────────────────────────────────────────────────────────

export interface KeyPairSet {
  encryption: { publicKey: CryptoKey; privateKey: CryptoKey };
  signing: { publicKey: CryptoKey; privateKey: CryptoKey };
  encryptionPublicKeyPem: string;
  signingPublicKeyPem: string;
}

export async function generateKeyPairSet(): Promise<KeyPairSet> {
  const encryptionPair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"],
  );
  const signingPair = await crypto.subtle.generateKey(
    { name: "RSA-PSS", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );

  const encPubRaw = await crypto.subtle.exportKey("spki", encryptionPair.publicKey);
  const sigPubRaw = await crypto.subtle.exportKey("spki", signingPair.publicKey);

  return {
    encryption: encryptionPair,
    signing: signingPair,
    encryptionPublicKeyPem: spkiToPem(encPubRaw),
    signingPublicKeyPem: spkiToPem(sigPubRaw),
  };
}

// ── IndexedDB private key persistence ────────────────────────────────────────

const DB_NAME = "secure-eval-keys";
const DB_VERSION = 1;
const STORE_NAME = "private-keys";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storePrivateKeys(encryptionPrivKey: CryptoKey, signingPrivKey: CryptoKey): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(encryptionPrivKey, "encryption");
    store.put(signingPrivKey, "signing");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPrivateKeys(): Promise<{ encryptionPrivKey: CryptoKey; signingPrivKey: CryptoKey } | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const encReq = store.get("encryption");
    const sigReq = store.get("signing");
    tx.oncomplete = () => {
      if (!encReq.result || !sigReq.result) { resolve(null); return; }
      resolve({ encryptionPrivKey: encReq.result as CryptoKey, signingPrivKey: sigReq.result as CryptoKey });
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearPrivateKeys(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── public key import ─────────────────────────────────────────────────────────

export async function importEncryptionPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", pemToSpki(pem), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
}

export async function importSigningPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("spki", pemToSpki(pem), { name: "RSA-PSS", hash: "SHA-256" }, false, ["verify"]);
}

// ── file encryption (AES-256-GCM) ────────────────────────────────────────────

export async function encryptFile(
  file: File,
  _aad: Record<string, unknown>,   // kept for API compatibility; context-binding lives in the signed manifest instead
): Promise<{ payload: EncryptedPayload; rawAesKey: ArrayBuffer }> {
  const plaintext = await file.arrayBuffer();
  const plaintextSha256 = await sha256Hex(plaintext);

  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Web Crypto AES-GCM appends the 16-byte auth tag to the ciphertext.
  // We deliberately do NOT pass additionalData here — the same AAD must be supplied on decrypt,
  // and we don't currently roundtrip AAD through the server. Context binding is enforced via the
  // RSA-PSS-signed manifest, which already commits to assignment_id, course_id, filename,
  // plaintext_sha256, and ciphertext_sha256.
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    aesKey,
    plaintext,
  );

  const ciphertextBytes = new Uint8Array(ciphertextWithTag, 0, ciphertextWithTag.byteLength - 16);
  const tagBytes = new Uint8Array(ciphertextWithTag, ciphertextWithTag.byteLength - 16);
  const ciphertextSha256 = await sha256Hex(ciphertextWithTag);

  const rawAesKey = await crypto.subtle.exportKey("raw", aesKey);

  return {
    payload: {
      ciphertext: ciphertextWithTag,
      iv: ab2b64(iv.buffer),
      tag: ab2b64(tagBytes.buffer),
      plaintextSha256,
      ciphertextSha256,
    },
    rawAesKey,
  };
}

// ── AES key wrapping (RSA-OAEP) ───────────────────────────────────────────────

export async function wrapAesKey(rawAesKey: ArrayBuffer, recipientPublicKeyPem: string): Promise<string> {
  const recipientPublicKey = await importEncryptionPublicKey(recipientPublicKeyPem);
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientPublicKey, rawAesKey);
  return ab2b64(wrappedKey);
}

// ── AES key unwrapping ────────────────────────────────────────────────────────

export async function unwrapAesKey(wrappedKeyB64: string, encryptionPrivKey: CryptoKey): Promise<CryptoKey> {
  const wrappedKeyBytes = b64ToAb(wrappedKeyB64);
  const rawAesKey = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, encryptionPrivKey, wrappedKeyBytes);
  return crypto.subtle.importKey("raw", rawAesKey, { name: "AES-GCM" }, false, ["decrypt"]);
}

// ── file decryption ───────────────────────────────────────────────────────────

export async function decryptFile(payload: EncryptedPayload, aesKey: CryptoKey): Promise<ArrayBuffer> {
  const ivBytes = new Uint8Array(b64ToAb(payload.iv));
  // ciphertext already includes the tag when it comes from encryptFile
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
    aesKey,
    payload.ciphertext,
  );
  return plaintext;
}

// ── manifest signing (RSA-PSS) ────────────────────────────────────────────────

export async function signManifest(
  manifest: Record<string, unknown>,
  signingPrivKey: CryptoKey,
  signingKeyId: number,
): Promise<SignedManifest> {
  const canonical = JSON.stringify(manifest, Object.keys(manifest).sort());
  const payloadBytes = new TextEncoder().encode(canonical);
  const manifestSha256 = await sha256Hex(payloadBytes);

  const signatureBuffer = await crypto.subtle.sign(
    { name: "RSA-PSS", saltLength: 32 },
    signingPrivKey,
    payloadBytes,
  );

  return {
    manifest,
    manifestSha256,
    signingKeyId,
    signatureAlgorithm: "RSA-PSS-SHA256",
    signatureValue: ab2b64(signatureBuffer),
  };
}

// ── manifest verification ─────────────────────────────────────────────────────

export async function verifyManifest(signedManifest: SignedManifest, signerPublicKeyPem: string): Promise<boolean> {
  try {
    const signerPublicKey = await importSigningPublicKey(signerPublicKeyPem);
    const canonical = JSON.stringify(signedManifest.manifest, Object.keys(signedManifest.manifest).sort());
    const payloadBytes = new TextEncoder().encode(canonical);
    return crypto.subtle.verify(
      { name: "RSA-PSS", saltLength: 32 },
      signerPublicKey,
      b64ToAb(signedManifest.signatureValue),
      payloadBytes,
    );
  } catch {
    return false;
  }
}

// ── public fingerprint ────────────────────────────────────────────────────────

export async function fingerprintPublicKey(pem: string): Promise<string> {
  const spki = pemToSpki(pem);
  return sha256Hex(spki);
}
