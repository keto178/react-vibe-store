# Manual Review

These items are intentionally left for follow-up, but they no longer affect production persistence safety:

- `backend/src/app/controllers/assetController.js`
  The legacy `/api/assets/blob` reader is still present to avoid breaking historical blob URLs. Long term, existing records should be migrated to direct provider URLs.
- `frontend/src/utils/storageCleanup.js`
  Still removes old local-storage keys from the pre-hardening runtime. Safe to keep for now, but it can be simplified after enough client sessions have rolled forward.
- `legacy/local-artifacts/`
  Holds moved local installer/log artifacts that are not part of the active application.
