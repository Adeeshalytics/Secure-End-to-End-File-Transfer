import { apiRequest } from "@/lib/api/client";
import type { PublicKeyAlgorithm, PublicKeyType } from "@/lib/crypto/types";

export interface PublicKeyRegistrationRequest {
  key_type: PublicKeyType;
  algorithm: PublicKeyAlgorithm;
  public_key_pem: string;
  fingerprint_sha256: string;
}

export interface RegisteredPublicKey {
  id: number;
  user: number;
  key_type: PublicKeyType;
  algorithm: PublicKeyAlgorithm;
  public_key_pem: string;
  fingerprint_sha256: string;
  status: "active" | "revoked" | "expired";
  created_at: string;
  revoked_at: string | null;
}

export function registerPublicKey(
  accessToken: string,
  request: PublicKeyRegistrationRequest
): Promise<RegisteredPublicKey> {
  return apiRequest<RegisteredPublicKey>("/keys/register/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(request)
  });
}

export function listMyPublicKeys(accessToken: string): Promise<RegisteredPublicKey[]> {
  return apiRequest<RegisteredPublicKey[]>("/keys/me/", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

