Supernote (MVP)

An end-to-end encrypted, accountless note store.

- Bookmarkable URLs: `/notes/<workspaceId>`
- Single password per workspace; no recovery in MVP
- Remember me: stores workspace key in the browser (IndexedDB)
- Text-only: encrypted titles, bodies, transcripts

Backend
- Django + DRF API storing ciphertext only
- Simple write auth via a workspace write token (client-derived)

Frontend
- React (Vite) skeleton with WebCrypto
- PBKDF2 (WebCrypto) to seal workspace key with user password
- AES-GCM encryption for all content using the workspace key

Dev Notes
- This is a scaffold; you will need to install deps for backend and frontend to run.
- API base path: `/api`

