# SecureEval — Demo & Reference Guide

End-to-end encrypted academic file exchange. Built for the IS course final.
Defended on the principle: **the server is untrusted by design.**

---

## 1. One-sentence pitch

> The server holds nothing it can read. Encryption, signing, decryption, and key generation all happen in the browser using the Web Crypto API. Only ciphertext, wrapped keys, signatures, and a tamper-evident audit chain ever leave the user's device.

---

## 2. Trust boundaries

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER  (trusted with plaintext + private keys)                    │
│  ─────────────────────────────────────────────────────────────────   │
│   • Generate RSA-2048 key pairs (encryption + signing)               │
│   • Store private keys in IndexedDB, non-exportable                  │
│   • AES-256-GCM file encryption                                      │
│   • RSA-OAEP key wrapping for each recipient                         │
│   • RSA-PSS-SHA256 manifest signing                                  │
│   • SHA-256 plaintext + ciphertext hashes                            │
└──────────────────────────────────────────────────────────────────────┘
                              │  HTTPS + JWT
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  DJANGO API  (untrusted with plaintext, trusted only for transport)  │
│  ─────────────────────────────────────────────────────────────────   │
│   • JWT auth (60-min access, 7-day rotating refresh)                 │
│   • RBAC (5 roles via RoleAssignment)                                │
│   • Validates ciphertext SHA-256 on upload                           │
│   • Returns wrapped keys & signatures untouched                      │
│   • Appends every write to SHA-256 audit hash chain                  │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  POSTGRES + DISK  (sees only ciphertext)                             │
│  ─────────────────────────────────────────────────────────────────   │
│   • media/ciphertext/<uuid>.enc — AES-256-GCM blob                   │
│   • EncryptedFileKey rows — wrapped AES keys per recipient           │
│   • Signature & FileManifest — RSA-PSS signed metadata               │
│   • AuditLog — tamper-evident hash chain                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology stack

### Frontend
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR-friendly, React 19, modern routing |
| Language | TypeScript (strict) | Type-safety for crypto code is critical |
| Crypto | Web Crypto API (browser-native) | C++ implementation, no supply-chain risk, enforces non-exportable keys |
| Auth storage | sessionStorage | Tab-scoped, dies when tab closes |
| Private keys | IndexedDB (`CryptoKey` objects) | Structured-clone preserves keys without exposing raw bytes |
| Icons | lucide-react | Tree-shakable, consistent |

### Backend
| Layer | Choice | Why |
|---|---|---|
| Framework | Django 5.1+ | Mature ORM + admin |
| API | Django REST Framework | Standard, declarative |
| Auth | djangorestframework-simplejwt | JWT with rotation + blacklist |
| Database | PostgreSQL 16 (Docker) | Transactional integrity for audit chain |
| Storage | Local filesystem `media/ciphertext/` | Simple for demo; pluggable for S3 |
| CORS | django-cors-headers | Whitelist `localhost:3000` only |

### Cryptographic primitives
| Purpose | Algorithm | Parameters |
|---|---|---|
| File encryption | **AES-256-GCM** | 256-bit key, 96-bit random IV, 128-bit auth tag |
| Key wrapping | **RSA-OAEP-SHA256** | 2048-bit modulus, SHA-256 hash |
| Signing | **RSA-PSS-SHA256** | 2048-bit modulus, 32-byte salt |
| Hashing | **SHA-256** | Plaintext + ciphertext fingerprints, audit chain, key fingerprints |
| Canonical JSON | sorted keys, compact | Deterministic bytes-to-sign for manifests |

---

## 4. The five security properties (claim → mechanism)

| Property | Mechanism |
|---|---|
| **Confidentiality** | AES-256-GCM; server holds only ciphertext |
| **Integrity** | AES-GCM 128-bit auth tag rejects any byte-level modification |
| **Authenticity** | RSA-PSS-SHA256 signed manifest tied to registered public key fingerprint |
| **Non-repudiation** | Signature + manifest + public key fingerprint form an unrepudiable triple |
| **Access control** | Per-recipient RSA-OAEP wrapped AES key — server cannot grant access retroactively |
| **Auditability** | SHA-256 hash chain on every write — detects edits and deletions of past entries |

---

## 5. Roles & demo accounts

| Username | Password | Role | What they can do |
|---|---|---|---|
| `alice` | `DemoPassword1!` | student | Upload submissions, view rubrics |
| `bob` | `DemoPassword1!` | examiner | Decrypt submissions, upload rubrics |
| `admin` | `DemoPassword1!` | course_admin | Audit log, user management |

Roles enforced via `RoleAssignment` (with revocation) → checked at endpoint level.

---

## 6. Pre-demo startup checklist

```powershell
# Terminal 1 — Database
docker compose up -d postgres

# Terminal 2 — Backend (port 8001 to avoid conflicts)
cd backend
python manage.py runserver 8001

# Terminal 3 — Frontend
cd frontend
npm run dev
```

**Verify before lecturer arrives:**
- [ ] `http://localhost:3000` loads
- [ ] Login with alice → ✓
- [ ] Login with bob → ✓
- [ ] Django Admin at `http://localhost:8001/admin` loads (no yellow error page)
- [ ] /audit page shows **green** "Hash chain verified"
- [ ] DevTools (F12) Console is **open** in Bob's window for stage diagnostics

**If anything is broken:**
- Audit chain broken → `AuditLog.objects.all().delete()` then do a fresh login
- Decrypt fails → wipe `SecureFile`, `UserPublicKey`, ciphertext blobs, IndexedDB → regenerate keys
- 401 errors → bump `JWT_ACCESS_TOKEN_MINUTES` in `.env`, restart

---

## 7. The demo — 5 acts, ~18 minutes

### Opening line (30 sec)

> *"This system demonstrates end-to-end encrypted file exchange where the server is untrusted by design. The server stores ciphertext, wrapped keys, and signatures — it cannot read any file, ever, even with full database access. Everything I'm about to show you proves that claim."*

---

### Act 1 — Key Generation (2 min)

**Claim:** Private keys exist only in the browser.

**Steps:**
1. Bob's window → Keys → **Generate & Register Key Pair**
2. Watch the spinner → two key cards appear (Encryption + Signing)
3. Point to the SHA-256 fingerprint: *"That's what the server stores"*
4. Open DevTools → Application → IndexedDB → `secure-eval-keys` → `private-keys` store
5. Show two entries: `encryption`, `signing` — both `CryptoKey` objects
6. Repeat for Alice

**Talking points:**
- RSA-2048 — 2048-bit modulus, public exponent 65537
- Two separate pairs: OAEP for encryption (wrap AES keys), PSS for signing (manifests)
- `CryptoKey` objects are non-exportable by design — even malware in the page can't read the bytes
- The server's `UserPublicKey` table stores only public key PEM + SHA-256 fingerprint

---

### Act 2 — Encrypted Submission (3 min)

**Claim:** Plaintext never reaches the server.

**Steps:**
1. Alice's window → DevTools → Network tab, filter `upload`
2. /submissions → select assignment → choose a PDF → **Encrypt & Upload**
3. While encrypting, narrate the three phases shown in the badge:
   - *Encrypting with AES-256-GCM*
   - *Wrapping AES key for each examiner* (RSA-OAEP)
   - *Signing manifest with RSA-PSS*
4. After upload, click the `/files/upload/` request → Request payload tab
5. Show: binary `.enc` blob + a JSON metadata field (no plaintext, no filename in plain)
6. Switch to Django Admin → Files → Secure Files → click the new row
7. Show columns: `ciphertext_sha256`, `aes_gcm_iv`, `aes_gcm_tag`, `object_storage_key`
8. Show the actual blob on disk: `media/ciphertext/<uuid>.enc` — open with `Get-Content -Encoding Byte` → noise

**Talking points:**
- AES-256-GCM key generated fresh per file (random 256-bit key, never reused)
- 96-bit random IV per encryption — NIST-recommended length for GCM
- 128-bit auth tag appended to ciphertext, authenticated implicitly
- The manifest contains plaintext hash, ciphertext hash, IV, file metadata — all RSA-PSS signed
- Alice fetches Bob's public key from `/keys/examiner-keys/` and wraps the AES key for each examiner separately

---

### Act 3 — Cross-Role Decryption (3 min)

**Claim:** Per-recipient access without the server holding any decryption key.

**Steps:**
1. Bob's window → /submissions → see Alice's file in the list
2. Click **Decrypt** → narrate the badge progression:
   - *Fetching ciphertext…*
   - *Unwrapping AES key…* (RSA-OAEP decrypt)
   - *Decrypting…* (AES-GCM decrypt)
3. File downloads, success badge appears with *"✓ Decrypted · Signed by alice"*
4. Open Django Admin → Files → Encrypted File Keys → show Bob's row
5. Point at `wrapped_key_ciphertext`: that's the AES key encrypted with Bob's RSA-OAEP public key

**Talking points:**
- The `EncryptedFileKey` table is the access control mechanism
- One row per (file, recipient) — revoking access = setting `revoked_at`
- The server never holds the AES key — it holds *N copies of it wrapped for N recipients*
- If Bob's row didn't exist, the download endpoint returns 403 — the server can't grant access it doesn't have the keys for

---

### Act 4 — Tamper Detection (3 min) ⭐ The money shot

**Claim:** Server-side tampering is detected instantly.

**Steps:**
1. Verify baseline: Bob decrypts successfully → ✓ green
2. Switch to Django Admin → Files → Secure Files → latest entry
3. Change one character of `aes_gcm_iv` field (e.g., first letter) → Save
4. *"I'm now a malicious sysadmin. I changed one byte of the IV. The blob on disk is untouched. Hash, tag, signature, manifest — all unchanged. Let's see what happens."*
5. Bob's window → Decrypt again
6. **Red badge:** ⚠ TAMPER DETECTED — AES-256-GCM authentication tag mismatch
7. DevTools Console: `[decrypt] failure for file N at stage=decrypt OperationError`
8. **Restore the IV character** → Save → Decrypt again → ✓ green

**Talking points:**
- AES-GCM auth tag is computed over (IV + ciphertext + AAD)
- Changing one bit anywhere invalidates the tag
- Web Crypto API refuses to return any plaintext on tag mismatch — attacker learns *nothing*
- The `stage=decrypt` console message proves the failure is at the AES layer, not the RSA key unwrap
- Restoring the byte restores decryption → proves the detection is specific, not coincidental

---

### Act 5 — Tamper-Evident Audit Chain (2 min) — The closer

**Claim:** Even the log itself is tamper-evident.

**Steps:**
1. /audit → green banner: **"Hash chain verified — N entries"**
2. Point at Prev hash / This hash columns: *"Each row commits to the previous row's hash"*
3. Open Django Admin → Audit logs → pick an early entry → change its `action` field → Save
4. /audit → refresh → 🔴 **"HASH CHAIN BROKEN"** banner, broken rows highlighted
5. *"One byte, in one row, in the past. The system detected it without any signing key — pure SHA-256 over public data."*
6. Restore the field → refresh → green again

**Talking points:**
- Each entry's `current_log_hash = SHA-256({payload, previous_hash})`
- Modify any past entry → its hash changes → every subsequent entry's `previous_log_hash` becomes stale → chain breaks
- Detection is **keyless** — no key custody problem
- A blockchain solves Byzantine consensus across untrusted parties; we have one server, so a hash chain is sufficient

---

### Closing line (30 sec)

> *"Five demonstrations. The server never saw plaintext. Tampering with a file is detected by AES-GCM. Tampering with audit history is detected by SHA-256 chaining. Per-recipient access is granted by RSA-OAEP key wrapping. Non-repudiation is provided by RSA-PSS signatures. Five primitives, one zero-trust architecture — and every claim was demonstrated, not just stated."*

---

## 8. Prepared answers for hard questions

### Threat model

**Q: What's your threat model?**
> Adversaries: (1) honest-but-curious server admin, (2) compromised database, (3) network attacker on the wire. **Out of scope:** browser compromise — if the attacker controls the user's browser, they have the plaintext anyway. We're not solving end-device security; we're solving server-side trust.

**Q: What if an attacker steals the database?**
> Useless. The `.enc` blobs are AES-256-GCM ciphertext. The wrapped AES keys are RSA-OAEP ciphertext requiring private keys that only live in users' browsers (IndexedDB). The attacker would need every user's IndexedDB too, which means a separate device-level compromise per user.

### Cryptographic choices

**Q: Why AES-256 instead of AES-128?**
> Defense against future quantum capability. Grover's algorithm halves effective key length, so AES-256 is the conservative choice for files that may need to remain confidential for years.

**Q: Why GCM instead of CBC + HMAC?**
> GCM is an AEAD (Authenticated Encryption with Associated Data) — single primitive provides confidentiality + integrity. CBC + HMAC requires correct construction (encrypt-then-MAC) and is easier to get wrong. GCM is also hardware-accelerated on modern CPUs via AES-NI.

**Q: Why RSA-OAEP instead of RSA-PKCS#1 v1.5?**
> OAEP has provable IND-CCA2 security and resists Bleichenbacher's chosen-ciphertext attack, which broke v1.5 padding in production systems (e.g., ROBOT in 2017).

**Q: Why RSA-PSS instead of PKCS#1 v1.5 for signing?**
> PSS has a tighter security reduction to RSA. v1.5 signatures have been broken in low-exponent or padding-oracle scenarios. PSS uses random salt, making it probabilistic and harder to mount forgery attacks against.

**Q: Why RSA-2048 and not 4096 or ECC?**
> 2048-bit RSA is the current NIST-recommended minimum for general use (good through ~2030). 4096 would double signing cost with marginal practical security gain. ECC (P-256) would be smaller and faster but adds complexity for academic project scope.

**Q: Why not Curve25519 / Ed25519?**
> Better choices in greenfield projects. Web Crypto API support for Ed25519 is uneven (Safari added it only in 17.4, March 2024). RSA is universally supported and the algorithm choice is independent of the security architecture.

### Key management

**Q: What if a user loses their browser / clears IndexedDB?**
> Their files become permanently unrecoverable — there's no key escrow. This is the standard tradeoff: forward security vs. recoverability. A production system would offer encrypted key backup via a passphrase-derived KEK, or social recovery (Shamir-style).

**Q: How do you handle key rotation?**
> Backend revokes the old `UserPublicKey` on registration of a new one (status → REVOKED). Files uploaded before rotation remain decryptable only by whoever held the previous private key. Re-encryption of old files requires the original holder to perform it (no key escrow).

**Q: How do you prevent the server from MITM'ing public keys?**
> Out of scope for the demo — would require external fingerprint verification (TOFU, web of trust, or a transparency log). The architecture doesn't preclude any of those.

### Audit & non-repudiation

**Q: Why a hash chain and not signing the log?**
> Signing requires a server-held key, which becomes the new single point of failure. A hash chain is keyless: SHA-256 over public data. Tradeoff: it doesn't prevent rewriting, only makes rewriting detectable — which is the standard model for audit trails (HIPAA, PCI-DSS, SOC 2 all require detection, not prevention).

**Q: Couldn't an attacker just delete the audit table?**
> Wholesale deletion is loud — backups, replicas, expected entry volume, and missing entries all expose it. The chain protects against the *subtle* attack: editing one entry to hide one incident.

**Q: What about race conditions in the audit chain?**
> Acknowledged limitation in the current code — the read-previous and insert are not in a transaction. Production fix: wrap in `SELECT ... FOR UPDATE` on the latest row to serialize appends. Postgres handles this cheaply.

### Implementation

**Q: Why Web Crypto API and not a library like libsodium-js?**
> Web Crypto is browser-native (C++/Rust implementation), has no NPM supply-chain risk, and enforces non-exportable keys at the platform level. Libsodium-js is excellent but adds a JS dependency that lives in the same memory as the page.

**Q: Why JWT instead of session cookies?**
> Stateless authentication on the API side. Simpler for a SPA. Tradeoff: harder to revoke than sessions, mitigated by short access-token TTL (60 min) and refresh-token rotation with blacklist.

**Q: Why local filesystem instead of S3?**
> Scope. The `object_storage_key` column is opaque to the rest of the system — swap the storage backend without touching cryptography. For production we'd use S3 with server-side encryption *also* enabled (defense in depth) and signed download URLs.

---

## 9. Architecture cheat sheet (one-page)

```
┌─ Upload flow ──────────────────────────────────────────────────┐
│ 1. Browser generates random AES-256 key                        │
│ 2. AES-GCM encrypts plaintext → ciphertext + IV + tag          │
│ 3. SHA-256 over plaintext + ciphertext                         │
│ 4. Fetch all recipient public keys from server                 │
│ 5. RSA-OAEP wrap AES key once per recipient                    │
│ 6. Build manifest {plaintext_hash, ciphertext_hash, IV, ...}   │
│ 7. RSA-PSS sign canonical-JSON manifest                        │
│ 8. POST {ciphertext, metadata{wrapped_keys, signature, ...}}   │
│ 9. Server verifies ciphertext hash, writes rows transactionally│
│ 10. Audit middleware appends entry with previous_hash chain    │
└────────────────────────────────────────────────────────────────┘

┌─ Download flow ────────────────────────────────────────────────┐
│ 1. GET /files/{id}/download/ — server checks                   │
│    EncryptedFileKey for request.user, returns 403 if missing   │
│ 2. Server returns ciphertext_b64 + wrapped_key + signature     │
│ 3. Browser loads private key from IndexedDB                    │
│ 4. RSA-OAEP unwrap → raw AES key                               │
│ 5. AES-GCM decrypt(ciphertext, IV, tag) → plaintext OR throw   │
│ 6. (Optional) verify manifest signature with signer's pubkey   │
│ 7. Blob → download                                             │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. Closing one-liner if rushed

> *"The server is a dumb pipe. Browsers do all the crypto. Tampering is detected mathematically. Audit trails are self-verifying. That's the whole system."*
