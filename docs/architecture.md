# MiChat architecture

- Frontend: HTML, CSS and vanilla JavaScript.
- Backend: Python + FastAPI.
- Realtime: FastAPI WebSockets over WSS (Nginx terminates TLS).
- Database: MySQL / InnoDB, accessed through `backend/app/db.py`.
- E2EE: encryption and decryption remain in the browser using a reviewed,
  maintained protocol implementation.

The server stores ciphertext and authorized metadata only. It must not receive
message plaintext, private identity keys, ratchet state or attachment keys.
