# Architecture Scaffold

The backend stores authorization state, encrypted object metadata, wrapped file keys, signatures, and tamper-evident audit logs.

The frontend owns plaintext handling. The crypto services in this scaffold are placeholders that define boundaries for future AES-256-GCM, RSA-OAEP, RSA-PSS, and SHA-256 implementation.

## Trust Boundaries

- Browser: plaintext, private keys, signing, encryption, decryption.
- Django API: authentication, RBAC, metadata validation, routing.
- PostgreSQL: metadata and encrypted key material only.
- Object storage: ciphertext only.

