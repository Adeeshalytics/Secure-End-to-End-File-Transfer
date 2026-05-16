import { exportPublicKeySpki } from "./key-export";
import type { FingerprintMetadata } from "./types";

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return bytesToHex(digest);
}

export async function fingerprintPublicKey(publicKey: CryptoKey): Promise<FingerprintMetadata> {
  const spki = await exportPublicKeySpki(publicKey);
  return {
    fingerprintSha256: await sha256Hex(spki),
    fingerprintAlgorithm: "SHA-256",
    sourceEncoding: "SPKI"
  };
}
