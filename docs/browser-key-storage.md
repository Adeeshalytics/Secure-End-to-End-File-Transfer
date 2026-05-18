# Browser Key Storage

This project stores browser-generated Web Crypto key material in IndexedDB.

## Why IndexedDB

IndexedDB supports structured cloning of Web Crypto `CryptoKey` objects. This allows the frontend to persist browser-generated RSA-OAEP and RSA-PSS keypairs without converting private keys into strings or exporting them into application-managed formats.

The current key-management implementation stores:

- RSA-OAEP encryption/decryption `CryptoKeyPair`
- RSA-PSS signing/verification `CryptoKeyPair`
- SPKI public-key PEM metadata
- SHA-256 public-key fingerprints
- local public-key registration state

## Why localStorage and sessionStorage Are Forbidden

`localStorage` and `sessionStorage` are string-only stores. They are not appropriate for private keys because using them would require exporting or serializing sensitive key material.

They are also easier to misuse:

- accidental logging
- accidental JSON export
- broad script access after XSS
- no support for non-exportable `CryptoKey` semantics
- no structured validation of cryptographic object types

Private keys must never be placed in `localStorage`, `sessionStorage`, logs, URLs, API payloads, or backend storage.

## Residual Risks

IndexedDB reduces key-handling mistakes, but it does not make the browser fully trusted.

Residual risks include:

- malware or malicious browser extensions using keys while the user is active
- malicious frontend JavaScript delivered by a compromised deployment path
- XSS that calls legitimate crypto APIs
- device loss where the browser profile remains unlocked
- lack of hardware-backed key protection in the current scaffold

Future hardening should evaluate:

- WebAuthn-assisted key unlock
- passphrase-wrapped backup keys
- device enrollment and revocation
- strict CSP and deployment integrity controls
- user-visible key fingerprints and key rotation flows

