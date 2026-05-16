"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, RefreshCw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/features/auth/auth-provider";
import { clearKeys, hasRegisteredKeys, loadKeys, saveKeys, updateKeyRegistrationState } from "@/lib/crypto/key-storage";
import { generateBrowserKeyMaterial } from "@/lib/crypto/rsa";
import type { StoredBrowserKeyRecord } from "@/lib/crypto/types";
import { listMyPublicKeys, registerPublicKey, type RegisteredPublicKey } from "./key-api";
import { publicKeyRegistrationDrafts, toPublicKeyRegistrationRequests } from "./key-lifecycle";

type StatusTone = "neutral" | "success" | "warning" | "danger";

function StatusLine({ tone = "neutral", children }: { tone?: StatusTone; children: React.ReactNode }) {
  return <p className={`status status-${tone}`}>{children}</p>;
}

function shortFingerprint(fingerprint: string): string {
  return `${fingerprint.slice(0, 16)}...${fingerprint.slice(-12)}`;
}

export function KeyManagementPanel() {
  const { accessToken } = useAuth();
  const [storedRecord, setStoredRecord] = useState<StoredBrowserKeyRecord | null>(null);
  const [registeredKeys, setRegisteredKeys] = useState<RegisteredPublicKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const registrationComplete = useMemo(() => {
    if (!storedRecord) return false;
    return Boolean(storedRecord.registration?.encryptionKeyId && storedRecord.registration?.signingKeyId);
  }, [storedRecord]);

  async function refreshState() {
    setIsLoading(true);
    setStorageWarning(null);
    try {
      const [localKeys, remoteKeys] = await Promise.all([
        loadKeys().catch((error: Error) => {
          setStorageWarning(error.message);
          return null;
        }),
        accessToken ? listMyPublicKeys(accessToken) : Promise.resolve([])
      ]);
      setStoredRecord(localKeys);
      setRegisteredKeys(remoteKeys);

      if (localKeys && !(await hasRegisteredKeys())) {
        setStatus({ tone: "warning", message: "Keys exist in this browser, but local registration state is incomplete." });
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshState();
  }, [accessToken]);

  async function handleGenerateKeys() {
    setIsGenerating(true);
    setStatus(null);
    try {
      const keyMaterial = await generateBrowserKeyMaterial();
      const record = await saveKeys(keyMaterial);
      setStoredRecord(record);
      setStatus({
        tone: "success",
        message: "Browser keys generated and saved in IndexedDB. Private keys were not exported."
      });
    } catch (error) {
      setStatus({ tone: "danger", message: error instanceof Error ? error.message : "Unable to generate keys." });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRegisterKeys() {
    if (!accessToken || !storedRecord) return;
    setIsRegistering(true);
    setStatus(null);
    try {
      const drafts = publicKeyRegistrationDrafts(storedRecord);
      const requests = toPublicKeyRegistrationRequests(drafts);
      const responses = await Promise.all(
        requests.map(async (request) => {
          const existing = registeredKeys.find((key) => key.fingerprint_sha256 === request.fingerprint_sha256);
          return existing ?? registerPublicKey(accessToken, request);
        })
      );

      const encryptionKey = responses.find((key) => key.key_type === "rsa_oaep_encryption");
      const signingKey = responses.find((key) => key.key_type === "rsa_pss_signing");

      if (!encryptionKey || !signingKey) {
        throw new Error("Backend registration response did not include both required public keys.");
      }

      const updated = await updateKeyRegistrationState({
        encryptionKeyId: encryptionKey.id,
        signingKeyId: signingKey.id
      });
      setStoredRecord(updated);
      setRegisteredKeys(await listMyPublicKeys(accessToken));
      setStatus({ tone: "success", message: "Public keys registered. Backend stores public keys only." });
    } catch (error) {
      setStatus({ tone: "danger", message: error instanceof Error ? error.message : "Unable to register keys." });
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleClearKeys() {
    await clearKeys();
    setStoredRecord(null);
    setStatus({ tone: "warning", message: "Browser key material cleared from IndexedDB on this device." });
  }

  const encryptionRegistered = registeredKeys.some(
    (key) => key.fingerprint_sha256 === storedRecord?.encryptionPublicKey.fingerprint.fingerprintSha256
  );
  const signingRegistered = registeredKeys.some(
    (key) => key.fingerprint_sha256 === storedRecord?.signingPublicKey.fingerprint.fingerprintSha256
  );

  return (
    <div className="stack">
      <section className="panel stack">
        <div className="toolbar">
          <div>
            <h2>Key Management</h2>
            <p className="muted">Generate browser keys and register only public keys with the backend.</p>
          </div>
          <button className="button button-secondary" type="button" onClick={refreshState} disabled={isLoading}>
            <RefreshCw size={16} aria-hidden /> Refresh
          </button>
        </div>

        <div className="notice">
          <ShieldCheck size={20} aria-hidden />
          <div>
            <strong>Private keys never leave this browser.</strong>
            <p className="muted">
              IndexedDB can store Web Crypto `CryptoKey` objects directly. The backend receives SPKI public keys and
              SHA-256 fingerprints only.
            </p>
          </div>
        </div>

        {status ? <StatusLine tone={status.tone}>{status.message}</StatusLine> : null}
        {storageWarning ? <StatusLine tone="danger">{storageWarning}</StatusLine> : null}
        {isLoading ? <StatusLine>Loading key state...</StatusLine> : null}
      </section>

      <section className="panel stack">
        <h3>Browser key state</h3>
        {!storedRecord ? (
          <StatusLine tone="warning">No browser keys found on this device.</StatusLine>
        ) : (
          <>
            <StatusLine tone={registrationComplete ? "success" : "warning"}>
              {registrationComplete ? "Local registration state is complete." : "Local registration state is missing."}
            </StatusLine>
            <div className="key-grid">
              <div className="key-row">
                <span>RSA-OAEP encryption key</span>
                <code>{shortFingerprint(storedRecord.encryptionPublicKey.fingerprint.fingerprintSha256)}</code>
                <span className={`badge ${encryptionRegistered ? "badge-success" : "badge-warning"}`}>
                  {encryptionRegistered ? "registered" : "not registered"}
                </span>
              </div>
              <div className="key-row">
                <span>RSA-PSS signing key</span>
                <code>{shortFingerprint(storedRecord.signingPublicKey.fingerprint.fingerprintSha256)}</code>
                <span className={`badge ${signingRegistered ? "badge-success" : "badge-warning"}`}>
                  {signingRegistered ? "registered" : "not registered"}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="toolbar">
          <button className="button" type="button" onClick={handleGenerateKeys} disabled={isGenerating}>
            <KeyRound size={16} aria-hidden /> {isGenerating ? "Generating..." : "Generate keys"}
          </button>
          <button
            className="button"
            type="button"
            onClick={handleRegisterKeys}
            disabled={!storedRecord || !accessToken || isRegistering}
          >
            <Upload size={16} aria-hidden /> {isRegistering ? "Registering..." : "Register public keys"}
          </button>
          <button className="button button-danger" type="button" onClick={handleClearKeys} disabled={!storedRecord}>
            <Trash2 size={16} aria-hidden /> Clear browser keys
          </button>
        </div>
      </section>

      <section className="panel stack">
        <h3>Security notes</h3>
        <p className="muted">
          IndexedDB is used because it supports structured storage of Web Crypto `CryptoKey` objects. `localStorage` and
          `sessionStorage` are forbidden for private keys because they store string data, are easy to accidentally log or
          exfiltrate, and cannot preserve non-exportable key semantics.
        </p>
        <p className="muted">
          Residual browser risk remains: malware, malicious extensions, or a compromised frontend build can still misuse
          keys while the user is signed in. This is why deployment integrity, CSP, device management, and future WebAuthn
          hardening matter.
        </p>
      </section>
    </div>
  );
}
