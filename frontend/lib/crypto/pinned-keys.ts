/**
 * Key Pinning & Trust-On-First-Use (TOFU) Implementation
 * Prevents Public Key Substitution (MITM) attacks by remembering the fingerprints
 * of public keys we've previously trusted. If an attacker replaces a public key
 * on the server, the fingerprint will change and we will block the encryption.
 */

const PINNED_KEYS_STORAGE = "secure_eval_pinned_keys";

export interface PinnedKeys {
  [userId: string]: string; // userId -> fingerprint_sha256
}

export function getPinnedKeys(): PinnedKeys {
  if (typeof window === "undefined") return {};
  const data = localStorage.getItem(PINNED_KEYS_STORAGE);
  return data ? JSON.parse(data) : {};
}

export function pinKey(userId: number, fingerprint: string): void {
  const keys = getPinnedKeys();
  keys[userId] = fingerprint;
  localStorage.setItem(PINNED_KEYS_STORAGE, JSON.stringify(keys));
}

export function verifyOrPinKey(userId: number, fingerprint: string): void {
  const pinnedKeys = getPinnedKeys();
  const existingFingerprint = pinnedKeys[userId];

  if (!existingFingerprint) {
    // Trust On First Use (TOFU)
    pinKey(userId, fingerprint);
  } else if (existingFingerprint !== fingerprint) {
    
    throw new Error(
      `SECURITY ALERT: The public key for User #${userId} has changed!\n\n` +
      `Expected: ${existingFingerprint.slice(0, 16)}...\n` +
      `Received: ${fingerprint.slice(0, 16)}...\n\n` +
      `This could be a Man-in-the-Middle attack. Please verify the new fingerprint out-of-band before uploading.`
    );
  }
}
