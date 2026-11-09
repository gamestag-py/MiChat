# Security notes

- Never commit `.env`, credentials, private keys or plaintext message content.
- Validate authorization independently for every REST request and WebSocket event.
- Persist messages before broadcasting them.
- Keep E2EE operations in the browser and use a reviewed protocol library.
- Review retry behavior for non-idempotent writes before production use.
- Complete an independent security review before public launch.
