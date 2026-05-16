import hashlib
import json


def audit_hash(payload: dict, previous_hash: str = "") -> str:
    canonical = json.dumps({"payload": payload, "previous": previous_hash}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

