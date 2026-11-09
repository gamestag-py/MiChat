# MiChat — Project Progress & Next Steps

Last updated: 9 November 2026

## 1. Project overview

MiChat is a web-first, end-to-end encrypted messaging application.

**Selected stack**
- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Python, FastAPI
- Database: MySQL / MariaDB
- Realtime communication: WebSockets
- API style: REST for account, profile, privacy, and supporting operations

**Security principle:** Private keys and plaintext message content stay on client devices. The backend stores and routes encrypted payloads and public cryptographic material.

## 2. Repository structure

```text
MiChat/
├── frontend/
│   ├── assets/css/
│   ├── assets/js/
│   ├── assets/images/
│   ├── pages/
│   ├── components/
│   └── index.html
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── websocket/
│   ├── main.py
│   ├── db.py
│   ├── requirements.txt
│   └── tests/
├── database/migrations/
├── storage/
├── docs/architecture.md
├── docs/security.md
├── .env.example
├── .gitignore
└── README.md
```

Use the current repository layout if it has evolved.

## 3. Completed work

### Phase 0 — Scope and repository foundation
- [x] Project scope and technology stack established.
- [x] Initial repository structure created.
- [x] Database schema imported.
- [x] Python virtual environment and dependencies configured.
- [x] Environment configuration created.
- [x] FastAPI application starts successfully.
- [x] Health endpoint verified, including database connectivity.
- [x] API documentation available at `/docs`.
- [x] CORS configured for the frontend.
- [x] API router and status endpoint added.
- [x] Centralized response/error handling implemented.
- [x] Request logging middleware implemented.

### Phase 1 — Account foundation

#### Authentication and account recovery
- [x] Registration endpoint and request schema.
- [x] Argon2id password hashing.
- [x] Email/phone OTP verification flow.
- [x] OTP verification and resend endpoints.
- [x] Login endpoint.
- [x] Access-token and refresh-token session handling.
- [x] Refresh-token rotation.
- [x] Logout current session.
- [x] Logout all sessions.
- [x] Authenticated `/me` endpoint.
- [x] Forgot-password endpoint.
- [x] Reset-password endpoint.
- [x] Password reset revokes active sessions.
- [x] Authentication endpoints tested.
- [x] Rate limiting added and tested.

#### Profile
- [x] Get current user's profile.
- [x] Username availability check.
- [x] Update profile.
- [x] Profile schemas and service tests.
- [x] Profile API tested.

#### Privacy settings
- [x] Privacy settings schema.
- [x] Get privacy settings service.
- [x] Update privacy settings service.
- [x] Authenticated `GET /api/v1/privacy/me`.
- [x] Authenticated `PATCH /api/v1/privacy/me`.
- [x] Full and partial update tests.
- [x] Invalid visibility validation test (HTTP 422).
- [x] Original settings restored after testing.
- [x] Privacy API tests completed.

#### Contacts
- [ ] Contacts feature intentionally skipped for now.

## 4. Current position

**Phase 1 account foundation is complete for the selected scope.** Contacts are intentionally skipped.

The next phase is **Phase 2 — Device Registration and Cryptographic Foundations**. The immediate task is to implement device registration.

## 5. Next steps — Phase 2

### Step 1 — Device registration
- [ ] Inspect the exact `devices` table definition in `michat.sql`.
- [ ] Confirm column types, constraints, indexes, and foreign keys.
- [ ] Create device request/response schemas.
- [ ] Implement device registration service.
- [ ] Implement authenticated device registration endpoint.
- [ ] Derive the user ID from `get_current_user()`; do not accept it from the request body.
- [ ] Store public identity-key material only.
- [ ] Test successful registration and invalid input.

### Step 2 — Device management
- [ ] List the authenticated user's devices.
- [ ] Revoke a selected device.
- [ ] Prevent one user from revoking another user's device.
- [ ] Define behavior for revoking the current device/session.
- [ ] Test ownership checks and revocation.

### Step 3 — Signed prekeys
- [ ] Inspect the existing signed-prekey schema.
- [ ] Define request and response schemas.
- [ ] Register or rotate a device's signed prekey.
- [ ] Store the public signed-prekey and signature.
- [ ] Validate ownership and key metadata.
- [ ] Add tests.

### Step 4 — One-time prekeys
- [ ] Inspect the existing one-time-prekey schema.
- [ ] Add a batch upload endpoint.
- [ ] Validate batch size and key encoding.
- [ ] Implement atomic claiming of one available prekey for a target device.
- [ ] Ensure a prekey cannot be issued twice.
- [ ] Test concurrent claims and empty-prekey behavior.

### Step 5 — Cryptographic foundations
- [ ] Select and document the client-side cryptographic protocol and libraries.
- [ ] Define key formats, encodings, and versioning.
- [ ] Define device identity and signed-prekey verification behavior.
- [ ] Document key rotation and device-revocation implications.
- [ ] Add protocol-focused tests and security documentation.

**Phase 2 exit criteria:** A device can register its public identity material, publish signed and one-time prekeys, and make prekeys available for safe, atomic claiming. Private keys never leave the client.

## 6. Later roadmap

### Phase 3 — One-to-one end-to-end encrypted messaging
- [ ] Establish client-side session/key agreement.
- [ ] Encrypt and decrypt messages on client devices.
- [ ] Store and retrieve ciphertext through the backend.
- [ ] Add conversation creation and membership checks.
- [ ] Add message sequencing and delivery state.
- [ ] Verify the server never needs plaintext message content.

### Phase 4 — WebSockets and offline synchronization
- [ ] Authenticated WebSocket connections.
- [ ] Realtime message delivery.
- [ ] Online/offline presence subject to privacy settings.
- [ ] Reconnection and missed-message synchronization.
- [ ] Delivery acknowledgements.
- [ ] Multi-device event handling.

### Phase 5 — Encrypted attachments
- [ ] Client-side file encryption.
- [ ] Upload and download encrypted blobs.
- [ ] Store encryption metadata safely.
- [ ] Validate file size/type and access authorization.
- [ ] Test attachment decryption on recipient devices.

### Phase 6 — Chat controls and privacy
- [ ] Message deletion/editing behavior.
- [ ] Blocking and reporting workflows.
- [ ] Apply privacy settings to profile, avatar, last-seen, read receipts, and group invitations.
- [ ] Ensure server-side authorization matches privacy rules.

### Phase 7 — Multi-device and group messaging
- [ ] Multi-device message encryption and synchronization.
- [ ] Group creation and membership management.
- [ ] Group key distribution and rotation.
- [ ] Member removal and rekeying behavior.
- [ ] Group authorization tests.

### Phase 8 — Hardening and release
- [ ] Review authentication and session security.
- [ ] Move rate-limit storage to shared production storage such as Redis.
- [ ] Add account-scoped rate limits and abuse controls.
- [ ] Remove development OTP logging and integrate secure email/SMS delivery.
- [ ] Use a least-privilege database account.
- [ ] Review transaction retry behavior and write idempotency.
- [ ] Ensure relevant tables use InnoDB.
- [ ] Validate MySQL/MariaDB compatibility.
- [ ] Add deployment, backup, monitoring, and recovery procedures.
- [ ] Perform security review and end-to-end tests.

## 7. Important implementation notes

### Database helper

The backend database module exports a `Database` class, `DBConfig`, a `db` singleton, and `get_db`.

Use the existing singleton:

```python
from app.db import db

await db.init_pool()
row = await db.fetch_one(sql, params)
rows = await db.fetch_all(sql, params)
affected = await db.execute(sql, params)
await db.close()
```

For transaction cursors returning dictionary rows:

```python
import aiomysql

async with db.transaction() as conn:
    async with conn.cursor(aiomysql.DictCursor) as cursor:
        await cursor.execute("SELECT ...", params)
        row = await cursor.fetchone()
```

Do not import nonexistent module-level helpers such as `init_db`, `close_db`, or `fetch_one`.

### Authentication dependency

Use the existing dependency:

```python
from app.core.dependencies import get_current_user
```

For authenticated operations, derive the user ID from:

```python
current_user["id"]
```

Do not trust a client-supplied user ID for resources belonging to the current user.

### Development and production cautions
- Development OTPs are currently logged to the console; this is not production delivery.
- Current rate limiting uses in-memory storage and is not shared across workers or restarts.
- Add account-scoped throttling and secure OTP delivery before production.
- Avoid blind retries of non-idempotent database writes after ambiguous commits.
- Inspect the actual SQL schema before assuming column names or writing queries.
- Check `conversation_members.left_at` when authorizing conversation access.
- Sequence allocation and one-time-prekey claiming must be atomic.
- The SQL dump was created with MariaDB 10.4.32, while the roadmap targets MySQL 8.0.16+; compatibility still needs validation.
- Some tables in the existing dump may lack explicit InnoDB configuration; verify and correct this before production.

## 8. How to continue

Work in small, testable steps. Finish each step and run its tests before moving to the next. Do not implement contacts unless requested. Do not begin Phase 3 messaging until Phase 2 device and key foundations are complete.

**Immediate next action:** Inspect the `devices` table in `michat.sql`, then implement the device registration schema.
