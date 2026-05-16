export interface PublicKeyRegistrationDraft {
  keyType: "rsa_oaep_encryption" | "rsa_pss_signing";
  publicKeyPem: string;
  fingerprintSha256: string;
  signedRegistrationStatement?: string;
}

export async function generateUserKeyMaterial(): Promise<PublicKeyRegistrationDraft[]> {
  throw new Error("Browser key generation is intentionally not implemented in the scaffold.");
}

