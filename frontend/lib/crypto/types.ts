export interface EncryptedPayload {
  ciphertext: ArrayBuffer;
  iv: string;
  tag: string;
  plaintextSha256: string;
  ciphertextSha256: string;
}

export interface WrappedFileKey {
  recipientUserId: number;
  recipientKeyId: number;
  wrappedKeyAlgorithm: "RSA-OAEP-SHA256";
  wrappedKeyCiphertext: string;
}

export interface SignedManifest {
  manifest: Record<string, unknown>;
  manifestSha256: string;
  signingKeyId: number;
  signatureAlgorithm: "RSA-PSS-SHA256";
  signatureValue: string;
}

