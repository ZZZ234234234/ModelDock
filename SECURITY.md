# Security policy

Do not open a public issue containing an API key or private conversation.
Use the maintainer's private contact method on their GitHub profile to report
reproducible vulnerabilities. Rotate any key that has been exposed.

## Threat model

ModelDock v1 is a **personal** workbench. Provider configurations, conversations
and request history live in IndexedDB. API keys are held in JavaScript memory
by default and are cleared on a full page reload. The optional vault encrypts
keys using AES-256-GCM, random 96-bit IVs and per-save 128-bit salts, with a
PBKDF2-SHA-256 derived key (310,000 iterations). Its password exists in memory
only and cannot be recovered. Chats and history are **not encrypted**.

Encryption protects stored keys when locked. It does not protect against a
compromised unlocked page, an untrusted browser extension, a compromised
operating system, or someone with access to the unlocked browser session.
Use strong unique passwords and a trusted local instance for sensitive work.

## Data paths

- **Direct (default):** the browser sends keys and prompts to the configured
  provider. Browser CORS restrictions apply.
- **Opt-in relay:** the browser sends keys and prompts to this instance's
  `/api/relay` route, which forwards them to a pinned official HTTPS origin.
  The application does not store them on the server or log request bodies.
  The hosting operator and infrastructure can still observe transit data.
- **Custom and local providers:** direct only. The relay rejects arbitrary
  destinations, localhost, credentials in URLs, non-allowlisted paths and
  upstream redirects. Never turn it into an unrestricted forward proxy.
- Exported backups exclude the secret vault; request objects and error details
  redact credential headers and the currently used key. User-authored prompt
  text itself can contain sensitive information and remains in exports.
- Markdown does not execute raw HTML. Remote response images are omitted to
  avoid passive third-party tracking. External links open with `noopener`.

The relay has no built-in account system, persistent quotas or distributed
rate limiting. Keep the deployment private or add authentication and a
reverse-proxy rate limit before exposing a self-hosted instance to others.
The same-origin header check reduces browser abuse but is not authentication.

Local model access depends on the browser's private network/mixed-content
policy and the local server's CORS configuration. Permit your exact origin;
do not expose a local model server to the public internet.

The first release assumes one active editor tab. Simultaneous writes from
multiple tabs are last-write-wins. Export important work regularly.
