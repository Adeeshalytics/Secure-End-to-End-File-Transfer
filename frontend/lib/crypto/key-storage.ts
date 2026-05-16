import type { BrowserKeyMaterial, StoredBrowserKeyRecord, StoredKeyRegistrationState } from "./types";

const DATABASE_NAME = "secure-academic-eval-keys";
const DATABASE_VERSION = 1;
const STORE_NAME = "browser-key-records";
const DEFAULT_RECORD_ID = "current-user";

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runKeyStoreTransaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openKeyDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          database.close();
          reject(transaction.error);
        };
      })
  );
}

function isCryptoKeyPair(value: unknown): value is CryptoKeyPair {
  const candidate = value as CryptoKeyPair;
  return Boolean(candidate?.privateKey instanceof CryptoKey && candidate?.publicKey instanceof CryptoKey);
}

export function validateStoredKeyRecord(value: unknown): StoredBrowserKeyRecord {
  const candidate = value as StoredBrowserKeyRecord | undefined;
  if (!candidate || candidate.schemaVersion !== "v1") {
    throw new Error("Stored key record is missing or uses an unsupported schema.");
  }
  if (!isCryptoKeyPair(candidate.encryptionKeyPair) || !isCryptoKeyPair(candidate.signingKeyPair)) {
    throw new Error("Stored key record is malformed or missing CryptoKey pairs.");
  }
  if (
    candidate.encryptionPublicKey?.keyType !== "rsa_oaep_encryption" ||
    candidate.signingPublicKey?.keyType !== "rsa_pss_signing"
  ) {
    throw new Error("Stored key record has malformed public key metadata.");
  }
  return candidate;
}

export async function saveKeys(
  keyMaterial: BrowserKeyMaterial,
  registration?: StoredKeyRegistrationState
): Promise<StoredBrowserKeyRecord> {
  const record: StoredBrowserKeyRecord = {
    schemaVersion: "v1",
    savedAt: new Date().toISOString(),
    encryptionKeyPair: keyMaterial.encryptionKeyPair,
    signingKeyPair: keyMaterial.signingKeyPair,
    encryptionPublicKey: keyMaterial.encryptionPublicKey,
    signingPublicKey: keyMaterial.signingPublicKey,
    registration
  };

  await runKeyStoreTransaction("readwrite", (store) => store.put(record, DEFAULT_RECORD_ID));
  return record;
}

export async function loadKeys(): Promise<StoredBrowserKeyRecord | null> {
  const result = await runKeyStoreTransaction<StoredBrowserKeyRecord | undefined>("readonly", (store) =>
    store.get(DEFAULT_RECORD_ID)
  );
  if (!result) {
    return null;
  }
  return validateStoredKeyRecord(result);
}

export async function clearKeys(): Promise<void> {
  await runKeyStoreTransaction("readwrite", (store) => store.delete(DEFAULT_RECORD_ID));
}

export async function updateKeyRegistrationState(registration: StoredKeyRegistrationState): Promise<StoredBrowserKeyRecord> {
  const existing = await loadKeys();
  if (!existing) {
    throw new Error("Cannot update registration state because no browser keys are stored.");
  }

  const updated: StoredBrowserKeyRecord = {
    ...existing,
    registration: {
      ...existing.registration,
      ...registration,
      registeredAt: registration.registeredAt ?? new Date().toISOString()
    }
  };
  await runKeyStoreTransaction("readwrite", (store) => store.put(updated, DEFAULT_RECORD_ID));
  return updated;
}

export async function hasRegisteredKeys(): Promise<boolean> {
  const record = await loadKeys();
  return Boolean(record?.registration?.encryptionKeyId && record?.registration?.signingKeyId);
}
