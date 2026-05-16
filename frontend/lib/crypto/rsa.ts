import { fingerprintPublicKey } from "./fingerprint";
import { exportPublicKeyPem } from "./key-export";
import type { BrowserKeyMaterial, EncryptionPublicKey, SigningPublicKey } from "./types";

const RSA_MODULUS_LENGTH = 4096;
const PUBLIC_EXPONENT = new Uint8Array([1, 0, 1]);

async function generateRsaKeyPair(
  algorithm: RsaHashedKeyGenParams,
  keyUsages: KeyUsage[]
): Promise<CryptoKeyPair> {
  try {
    const keyPair = await window.crypto.subtle.generateKey(algorithm, false, keyUsages);
    await exportPublicKeyPem(keyPair.publicKey);
    return keyPair;
  } catch {
    // Some browsers apply extractability to the whole generated pair, including SPKI public export.
    // This fallback still never exports private keys from this application code.
    return window.crypto.subtle.generateKey(algorithm, true, keyUsages);
  }
}

export async function generateEncryptionKeyPair(): Promise<CryptoKeyPair> {
  return generateRsaKeyPair(
    {
      name: "RSA-OAEP",
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: PUBLIC_EXPONENT,
      hash: "SHA-256"
    },
    ["encrypt", "decrypt"]
  );
}

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return generateRsaKeyPair(
    {
      name: "RSA-PSS",
      modulusLength: RSA_MODULUS_LENGTH,
      publicExponent: PUBLIC_EXPONENT,
      hash: "SHA-256"
    },
    ["sign", "verify"]
  );
}

export async function describeEncryptionPublicKey(publicKey: CryptoKey): Promise<EncryptionPublicKey> {
  return {
    keyType: "rsa_oaep_encryption",
    algorithm: "RSA-OAEP-SHA256-4096",
    publicKeyPem: await exportPublicKeyPem(publicKey),
    fingerprint: await fingerprintPublicKey(publicKey)
  };
}

export async function describeSigningPublicKey(publicKey: CryptoKey): Promise<SigningPublicKey> {
  return {
    keyType: "rsa_pss_signing",
    algorithm: "RSA-PSS-SHA256-4096",
    publicKeyPem: await exportPublicKeyPem(publicKey),
    fingerprint: await fingerprintPublicKey(publicKey)
  };
}

export async function generateBrowserKeyMaterial(): Promise<BrowserKeyMaterial> {
  const encryptionKeyPair = await generateEncryptionKeyPair();
  const signingKeyPair = await generateSigningKeyPair();

  return {
    encryptionKeyPair,
    signingKeyPair,
    encryptionPublicKey: await describeEncryptionPublicKey(encryptionKeyPair.publicKey),
    signingPublicKey: await describeSigningPublicKey(signingKeyPair.publicKey)
  };
}
