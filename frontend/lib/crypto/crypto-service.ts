import type { EncryptedPayload, SignedManifest, WrappedFileKey } from "./types";

export class CryptoService {
  async encryptFile(_file: File, _aad: Record<string, unknown>): Promise<EncryptedPayload> {
    throw new Error("AES-256-GCM browser encryption is intentionally not implemented in the scaffold.");
  }

  async decryptFile(_payload: EncryptedPayload, _wrappedKey: WrappedFileKey): Promise<Blob> {
    throw new Error("AES-256-GCM browser decryption is intentionally not implemented in the scaffold.");
  }

  async wrapFileKeyForRecipients(_recipientKeyIds: number[]): Promise<WrappedFileKey[]> {
    throw new Error("RSA-OAEP key wrapping is intentionally not implemented in the scaffold.");
  }

  async signManifest(_manifest: Record<string, unknown>): Promise<SignedManifest> {
    throw new Error("RSA-PSS manifest signing is intentionally not implemented in the scaffold.");
  }

  async verifyManifest(_signedManifest: SignedManifest): Promise<boolean> {
    throw new Error("RSA-PSS manifest verification is intentionally not implemented in the scaffold.");
  }
}

export const cryptoService = new CryptoService();

