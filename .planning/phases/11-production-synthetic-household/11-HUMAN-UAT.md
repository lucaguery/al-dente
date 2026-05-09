---
status: partial
phase: 11-production-synthetic-household
source: [11-VERIFICATION.md]
started: 2026-05-09T14:35:00Z
updated: 2026-05-09T14:50:00Z
---

## Current Test

[awaiting human testing — item 1 currently blocked by environment SSL issue]

## Tests

### 1. End-to-End Prod Seed Smoke Check
expected: Both runs of `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic` print identical banner counts: `recipes: 21 / members: 2 / cooking_logs: 3 / votes: 7 / shortlists: 1 / storage objects (synthetic/): 21`. No errors. Run twice consecutively (D-13 idempotency smoke check).
result: blocked
blocker: Operator runs through a Zscaler corporate proxy (CN=Zscaler Intermediate Root CA, zscalertwo.net). Python's `httpx` (used by `storage3` for the Storage pre-flight `bucket.list("synthetic")` at `seed.py:669` → `storage.py:309`) fails with `[SSL: CERTIFICATE_VERIFY_FAILED] unable to get local issuer certificate`. macOS Keychain has the Zscaler root, but Python's `certifi` bundle does not. `curl` works; Python doesn't. `SSL_CERT_FILE=$(uv run python -c 'import certifi; print(certifi.where())')` does NOT fix it.
suggested_fix: Install `truststore` (Python 3.10+ stdlib bridge to system trust store) and call `truststore.inject_into_ssl()` once at process start; OR run from a non-Zscaler network (mobile hotspot) for the operator's seed runs; OR concatenate the Zscaler root from `security find-certificate -a -p -c "Zscaler Root CA" /Library/Keychains/System.keychain` onto certifi's bundle. Recommended: add `truststore` to `backend/pyproject.toml` and inject it in `app/cli/seed.py` before any HTTPS calls — single-line fix, self-healing across all corporate-proxy environments. Track as separate Phase 11.x or v0.2.2 follow-up.

### 2. Auditor Photo Rendering (Signed-URL Round-Trip)
expected: After joining via invite code `DEMO01` from iPhone, recipe detail pages show photos (not blank). Confirms `recipes.photo_paths = ["synthetic/<slug>.jpg"]` round-trips through the signed-URL flow at `routers/photos.py:173`.
result: blocked
blocker: Cannot run until item 1 unblocks (no synthetic photos in Storage means nothing to render).

### 3. Teardown Full Cycle
expected: First `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic --teardown` prints `votes removed: 7 / cooking_logs removed: 3 / daily_shortlists removed: 1 / recipes removed: 21 / members removed: 2 / households removed: 1 / storage objects removed: 21`. Second teardown prints all zeros + "Note: nothing to remove."
result: blocked
blocker: Cannot run until item 1 succeeds (need a seeded synthetic household to tear down).

## Summary

total: 3
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 3

## Gaps

### G-01: Python SSL trust store doesn't include corporate Zscaler root
- **Severity:** environmental (operator's network), not code defect, but blocks SEED-01/02/03/05 verification on operator's primary network
- **Surface:** discovered when operator ran `ALDENTE_PROD_SEED=1 uv run seed --prod-synthetic` and got `httpx.ConnectError: [SSL: CERTIFICATE_VERIFY_FAILED]` from the pre-flight Storage check
- **Root cause:** Python ships with the `certifi` CA bundle. Zscaler MITM proxies present an intermediate cert signed by `Zscaler Root CA` (visible in `security find-certificate -a -c "Zscaler" /Library/Keychains/System.keychain`). The macOS Keychain trusts it; `certifi/cacert.pem` does not.
- **Two-line fix worth shipping in v0.2.2:**
  ```python
  # In backend/app/cli/seed.py, top of main():
  try:
      import truststore
      truststore.inject_into_ssl()
  except ImportError:
      pass  # Best-effort; falls back to certifi if truststore missing
  ```
  Plus `truststore = "^0.10"` in `backend/pyproject.toml`.
- **Phase 11 status:** code is correct; environment gap surfaced during verification. Filing as v0.2.2 backlog or as a Phase 11.1 patch — operator's call.
