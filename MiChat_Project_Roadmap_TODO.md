# MiChat 1.0.0 --- Project Roadmap & TODO

**Last updated:** 10 November 2026\
**Current phase:** Phase 2 --- Conversation Management\
**Stack:** HTML, CSS, vanilla JavaScript, Python (FastAPI),
MySQL/MariaDB, WebSockets

> Status is based on implementation and tests confirmed in the project
> conversation. Unverified work remains pending.

## 1. Project overview

MiChat is a web-first messaging application with an end-to-end
encryption (E2EE) design.

  Layer                    Technology
  ------------------------ -------------------------------
  Frontend                 HTML, CSS, vanilla JavaScript
  Backend                  Python, FastAPI
  Database                 MySQL / MariaDB
  Realtime                 WebSockets
  Cryptography prototype   Web Crypto API

Run the backend from `backend/`:

``` powershell
python -m uvicorn app.main:app --reload
```

Use `python -m uvicorn` on Windows if the `uvicorn.exe` launcher is
blocked by Application Control.

## 2. Completed work

### Phase 1 --- Device Management

**Status: Implemented; listed flows tested.**

-   [x] Device registration.
-   [x] Signed prekey publishing.
-   [x] One-time prekey publishing.
-   [x] Device key-bundle claiming.
-   [x] Two-device Alice/Bob test.
-   [x] Local one-time-prekey consumption persistence.
-   [x] Sequential server-side one-time-prekey claims returned distinct
    key IDs (`3` and `4`).
-   [x] Device revocation endpoint tested.
-   [x] Revoked recipient device key bundle rejected.
-   [x] Protected endpoint rejected revoked device with
    `Device not found or revoked`.

**Verification still pending:** - \[ \] Concurrent one-time-prekey claim
race test. Sequential claims passed; concurrency safety is not yet
proven.

### Phase 2 --- Conversation Management

**Status: Partially complete.**

#### Conversation creation

-   [x] `ConversationCreateRequest` schema created.
-   [x] `create_conversation()` service implemented.
-   [x] `POST /api/v1/conversations/` implemented and router registered.
-   [x] Direct conversation created between Alice (user ID `1`) and Bob
    (user ID `2`).
-   [x] Sequential duplicate request returned the existing conversation
    instead of creating another.

Test conversation ID:

``` text
529fa1dd-f6f9-4c5e-bd6c-12fa85bed155
```

#### Conversation listing

-   [x] `list_conversations()` service implemented.
-   [x] `GET /api/v1/conversations/` implemented.
-   [x] Alice's list request tested.
-   [x] Response included conversation data, active members, roles,
    profiles, settings, and pagination.

#### Conversation details

-   [x] `get_conversation()` service implemented.
-   [x] `GET /api/v1/conversations/{conversation_id}` implemented.
-   [x] Alice's detail request tested successfully.
-   [x] Response included active members, roles, profiles, and the
    requesting user's settings.

#### Membership access control

-   [x] Non-member access test completed.
-   [x] Third user attempted to retrieve the conversation.
-   [x] API returned HTTP `404`, `Conversation not found`.

Verified response:

``` json
{
  "success": false,
  "message": "Conversation not found",
  "data": null,
  "errors": null,
  "status_code": 404
}
```

## 3. Pending work --- Phase 2

### 2.1 Per-user conversation settings

**Status: TODO --- intentionally skipped for now.**

Planned endpoint:

``` http
PATCH /api/v1/conversations/{conversation_id}/settings
```

Existing schema in `backend/app/schemas/conversation.py`:

``` python
class ConversationSettingsUpdateRequest(BaseModel):
    is_archived: bool | None = None
    is_muted: bool | None = None
    muted_until: datetime | None = None
    is_pinned: bool | None = None
```

Tasks:

-   [ ] Implement `update_conversation_settings()` in
    `backend/app/services/conversation_service.py`.
-   [ ] Add the PATCH endpoint in `backend/app/api/conversations.py`.
-   [ ] Ensure only active members can update their own settings.
-   [ ] Ensure one member cannot modify another member's settings.
-   [ ] Support archive/unarchive.
-   [ ] Support mute/unmute and optional `muted_until`.
-   [ ] Support pin/unpin.
-   [ ] Return updated settings consistently.
-   [ ] Test invalid conversation IDs.
-   [ ] Test non-member access.
-   [ ] Test each setting independently and in combination.

**Read position:** `last_read_sequence` exists in the database and is
returned by conversation reads, but is not part of the current settings
request schema. Decide whether to add it to this endpoint or create a
dedicated read-position endpoint. Validate that clients cannot advance
beyond the conversation's valid sequence.

### 2.2 Conversation metadata and names

**Status: TODO / not implemented.**

-   [ ] Define the client-encrypted metadata payload format and
    versioning.
-   [ ] Encrypt group names and other metadata on the client.
-   [ ] Store ciphertext in `conversations.metadata_ciphertext`.
-   [ ] Store and validate `metadata_version`.
-   [ ] Implement client-side metadata decryption.
-   [ ] Implement authorized metadata updates.
-   [ ] Test malformed and unsupported metadata versions.

**Current limitation:** The service returns `name: None`. The `name`
field in the create schema is not currently persisted. Group naming is
not complete.

### 2.3 Group membership management

**Status: TODO / not verified as implemented.**

-   [ ] Add group members.
-   [ ] Remove group members.
-   [ ] Enforce owner/admin permissions.
-   [ ] Prevent unauthorized membership changes.
-   [ ] Define voluntary leave behavior.
-   [ ] Define ownership transfer and admin-role rules.
-   [ ] Update `group_key_epoch` when membership changes.
-   [ ] Coordinate membership changes with client-side group-key
    rotation.
-   [ ] Test concurrent membership changes and permission boundaries.

Existing request schemas include `ConversationMemberAddRequest` and
`ConversationMemberRemoveRequest`; corresponding services and endpoints
are not confirmed complete.

### 2.4 Direct conversation concurrency

**Status: Verification pending.**

-   [x] Sequential duplicate direct-conversation request returns the
    existing conversation.
-   [ ] Check the live storage engine for `conversation_pairs`.
-   [ ] Confirm its unique `(user_low_id, user_high_id)` constraint is
    enforced transactionally.
-   [ ] Test simultaneous requests to create the same direct
    conversation.
-   [ ] Handle duplicate-key races and return the existing conversation.

The SQL dump did not explicitly declare an engine for
`conversation_pairs`. Verify the live database before relying on
transaction-based race protection.

## 4. Future roadmap

These phases are planned, not completed.

### Phase 3 --- Realtime messaging

-   [ ] Design authenticated WebSocket connection lifecycle.
-   [ ] Authenticate WebSocket connections using the existing session
    model.
-   [ ] Verify active conversation membership before subscription.
-   [ ] Implement conversation room/subscription management.
-   [ ] Define client/server event formats.
-   [ ] Implement message-send events.
-   [ ] Implement message-delivery events.
-   [ ] Implement reconnect and resynchronization.
-   [ ] Handle multiple active devices per user.
-   [ ] Add heartbeat, disconnect, and timeout handling.
-   [ ] Test unauthorized subscriptions.

### Phase 4 --- Encrypted message pipeline

-   [ ] Finalize encrypted message envelope format.
-   [ ] Define message header and ciphertext fields.
-   [ ] Encrypt messages client-side before sending.
-   [ ] Store ciphertext server-side without plaintext access.
-   [ ] Implement recipient-device fanout.
-   [ ] Decrypt messages client-side.
-   [ ] Handle offline recipient devices.
-   [ ] Add delivery and read acknowledgements.
-   [ ] Add replay and duplicate-message handling.
-   [ ] Test multi-device delivery.

### Phase 5 --- Cryptographic protocol hardening

**Important:** `frontend/assets/js/crypto.js` is a prototype, not a
production-ready Signal Protocol implementation.

Current prototype uses Web Crypto API, P-256 ECDSA identity keys, P-256
ECDH prekeys, HKDF-SHA256, AES-GCM, and IndexedDB persistence.

-   [ ] Replace or formally review the prototype session/key-agreement
    design.
-   [ ] Implement a reviewed ratcheting protocol, such as an appropriate
    Signal Protocol implementation.
-   [ ] Implement forward secrecy and post-compromise security.
-   [ ] Establish robust directional key management.
-   [ ] Add replay protection and message uniqueness guarantees.
-   [ ] Define identity-key change handling.
-   [ ] Implement safety-number or equivalent out-of-band identity
    verification.
-   [ ] Define secure backup and key recovery behavior, if supported.
-   [ ] Obtain independent cryptographic review before claiming
    production-grade E2EE.

Do not describe the current prototype as production-grade E2EE.
Fingerprint/signature tests alone do not authenticate a human identity;
an identity-verification mechanism is still needed.

### Phase 6 --- Message lifecycle and UX

-   [ ] Conversation history pagination.
-   [ ] Message history synchronization across devices.
-   [ ] Message edit/delete behavior and encrypted event design.
-   [ ] Typing indicators.
-   [ ] Presence/online status with privacy controls.
-   [ ] Unread counts.
-   [ ] Read and delivery receipts.
-   [ ] E2EE-compatible message search strategy.
-   [ ] Encrypted attachments and file transfer.
-   [ ] Notification preferences.
-   [ ] Block/report functionality and abuse controls.

### Phase 7 --- Frontend application

-   [ ] Authentication screens and session handling.
-   [ ] Device registration and key setup UX.
-   [ ] Conversation list UI.
-   [ ] Direct and group conversation views.
-   [ ] Message composer and send states.
-   [ ] Realtime connection indicators.
-   [ ] Settings and device-management screens.
-   [ ] Responsive desktop/mobile layouts.
-   [ ] Accessibility and keyboard navigation.
-   [ ] Error, loading, empty, and offline states.

### Phase 8 --- Testing, reliability, and deployment

-   [ ] Unit tests for services and schemas.
-   [ ] API integration tests.
-   [ ] WebSocket integration tests.
-   [ ] Multi-user and multi-device end-to-end tests.
-   [ ] Concurrent prekey-claim tests.
-   [ ] Concurrent direct-conversation creation tests.
-   [ ] Authorization tests for every conversation operation.
-   [ ] Database migration and backup/restore tests.
-   [ ] Rate limiting and abuse protection.
-   [ ] Logging/monitoring that excludes plaintext and secrets.
-   [ ] Production HTTPS and secure WebSocket configuration.
-   [ ] Deployment and rollback procedure.
-   [ ] Security review before public release.

## 5. Important files

  ------------------------------------------------------------------------------------
  Path                                             Purpose
  ------------------------------------------------ -----------------------------------
  `backend/app/main.py`                            FastAPI application entry point

  `backend/app/api/router.py`                      API router registration

  `backend/app/api/dependencies.py`                Authentication dependency

  `backend/app/api/conversations.py`               Conversation API endpoints

  `backend/app/services/conversation_service.py`   Conversation business logic

  `backend/app/schemas/conversation.py`            Conversation schemas

  `backend/app/db.py`                              Async MySQL database helper

  `frontend/assets/js/crypto.js`                   Current client-side crypto
                                                   prototype
  ------------------------------------------------------------------------------------

Database import:

``` python
from app.db import db
```

Confirmed database helper methods:

-   `db.fetch_one(query, params)`
-   `db.fetch_all(query, params)`
-   `db.execute(query, params)`
-   `db.execute_many(query, params_list)`
-   `db.transaction()`

Use the existing async transaction context manager with an
`aiomysql.DictCursor` when a transaction is needed. The
`run_transaction()` helper in the uploaded `db.py` appeared incomplete;
do not rely on it without repairing and testing it.

## 6. Development test references

These are development test identities, not production identities.

  Identity     User ID Role in current test
  ---------- --------- -----------------------------------
  Alice            `1` Direct conversation creator/owner
  Bob              `2` Direct conversation participant

Test conversation:

``` text
529fa1dd-f6f9-4c5e-bd6c-12fa85bed155
```

The Bob device used in an earlier device test was revoked. Do not assume
that device can still authenticate.

## 7. Database design notes

The current schema uses:

-   `conversations.id` as `BINARY(16)`.
-   `conversation_members` for user-level membership and roles.
-   `conversation_pairs` for normalized direct-conversation pairs.
-   `conversation_user_settings` for per-user archive, mute, pin, and
    read-position settings.
-   `metadata_ciphertext` and `metadata_version` for encrypted
    conversation metadata.
-   Separate device and prekey records.

Membership is user-based. Message/key delivery to each user's devices
must be handled separately.

## 8. Immediate next actions

Resume in this order:

1.  [ ] Implement and test
    `PATCH /api/v1/conversations/{conversation_id}/settings` ---
    intentionally skipped; remains TODO.
2.  [ ] Decide how `last_read_sequence` is updated and validated.
3.  [ ] Implement encrypted conversation metadata and group naming.
4.  [ ] Implement group member add/remove with role checks.
5.  [ ] Verify direct-conversation creation under concurrent requests.
6.  [ ] Begin authenticated WebSocket messaging.

## 9. Status tracking rules

-   Mark `[x]` only after implementation and the relevant test are
    confirmed.
-   Use `[~]` for partially implemented or
    implemented-but-not-adequately-tested work.
-   Keep unverified concurrency, security, and production-readiness
    claims pending.
-   Update this document whenever implementation or test status changes.
