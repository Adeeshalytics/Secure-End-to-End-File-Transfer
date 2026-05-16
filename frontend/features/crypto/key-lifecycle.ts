/**
 * Key lifecycle: generate RSA key pairs → register public keys with backend → store private keys in IndexedDB.
 * Private keys never leave the browser.
 */

import {
  clearPrivateKeys,
  generateKeyPairSet,
  loadPrivateKeys,
  storePrivateKeys,
  type KeyPairSet,
} from "@/lib/crypto/crypto-service";
import { apiRequest } from "@/lib/api/client";

export interface RegisteredKeyInfo {
  encryptionKeyId: number;
  signingKeyId: number;
  encryptionFingerprint: string;
  signingFingerprint: string;
}

export interface KeyState {
  hasKeys: boolean;
  encryptionKeyId: number | null;
  signingKeyId: number | null;
  encryptionFingerprint: string | null;
  signingFingerprint: string | null;
}

const KEY_INFO_STORAGE = "secure_eval_key_info";

export function getStoredKeyInfo(): RegisteredKeyInfo | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY_INFO_STORAGE);
  return raw ? (JSON.parse(raw) as RegisteredKeyInfo) : null;
}

function setStoredKeyInfo(info: RegisteredKeyInfo): void {
  sessionStorage.setItem(KEY_INFO_STORAGE, JSON.stringify(info));
}

export function clearStoredKeyInfo(): void {
  sessionStorage.removeItem(KEY_INFO_STORAGE);
}

export async function checkKeyState(): Promise<KeyState> {
  const info = getStoredKeyInfo();
  const privKeys = await loadPrivateKeys();
  if (!info || !privKeys) {
    return {
      hasKeys: false,
      encryptionKeyId: null,
      signingKeyId: null,
      encryptionFingerprint: null,
      signingFingerprint: null,
    };
  }
  return {
    hasKeys: true,
    encryptionKeyId: info.encryptionKeyId,
    signingKeyId: info.signingKeyId,
    encryptionFingerprint: info.encryptionFingerprint,
    signingFingerprint: info.signingFingerprint,
  };
}

export async function generateAndRegisterKeys(accessToken: string): Promise<RegisteredKeyInfo> {
  const keyPairSet: KeyPairSet = await generateKeyPairSet();

  const [encKeyRecord, sigKeyRecord] = await Promise.all([
    apiRequest<{ id: number; fingerprint_sha256: string }>("/keys/", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        key_type: "rsa_oaep_encryption",
        public_key_pem: keyPairSet.encryptionPublicKeyPem,
      }),
    }),
    apiRequest<{ id: number; fingerprint_sha256: string }>("/keys/", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        key_type: "rsa_pss_signing",
        public_key_pem: keyPairSet.signingPublicKeyPem,
      }),
    }),
  ]);

  await storePrivateKeys(keyPairSet.encryption.privateKey, keyPairSet.signing.privateKey);

  const info: RegisteredKeyInfo = {
    encryptionKeyId: encKeyRecord.id,
    signingKeyId: sigKeyRecord.id,
    encryptionFingerprint: encKeyRecord.fingerprint_sha256,
    signingFingerprint: sigKeyRecord.fingerprint_sha256,
  };
  setStoredKeyInfo(info);
  return info;
}

export async function resetKeys(): Promise<void> {
  await clearPrivateKeys();
  clearStoredKeyInfo();
}

export async function getPrivateKeysOrThrow() {
  const privKeys = await loadPrivateKeys();
  if (!privKeys) throw new Error("No private keys in this browser. Please go to /keys and generate your key pair.");
  return privKeys;
}
