class SecurityInvariantError(Exception):
    """Raised when a request would violate the ciphertext-only backend boundary."""

