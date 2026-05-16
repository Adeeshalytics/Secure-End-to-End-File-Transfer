export type FileType =
  | "student_submission"
  | "rubric"
  | "evaluation_material"
  | "feedback"
  | "ai_evaluation_result"
  | "examiner_evaluation";

export interface EncryptedFileManifest {
  manifest_json: Record<string, unknown>;
  manifest_sha256: string;
}

export interface SecureFileRecord {
  id: number;
  course: number;
  assignment: number;
  submission?: number | null;
  file_type: FileType;
  object_storage_key: string;
  ciphertext_sha256: string;
  plaintext_sha256: string;
  aes_gcm_iv: string;
  aes_gcm_tag: string;
  size_bytes: number;
  mime_type: string;
  encrypted_filename?: Record<string, unknown> | null;
  schema_version: string;
  manifest?: EncryptedFileManifest;
}

