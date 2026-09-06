# Architecture

## Modules

| Module | Responsibility |
| --- | --- |
| `app` | Next.js-compatible routes and optional stateless relay |
| `src/features` | Dashboard, chat, comparison, playground and management screens |
| `src/components` | Shared layout, Markdown, charts, parameter controls and onboarding |
| `src/providers` | Catalog, wire adapters, transport, SSE decoding and isolated demo |
| `src/lib/run.ts` | One request lifecycle: dispatch, cancellation, metrics and redaction |
| `src/lib/storage.ts` | Async local-storage port backed by IndexedDB |
| `src/lib/vault.ts` | Session keys and optional encrypted at-rest persistence |
| `src/store` | React state and serialized persistence writes |
| `src/types` | Strict domain schemas |

## Domain schema, version 1

The IndexedDB database `modeldock` has a `records` object store. The `state`
record contains an `AppData` snapshot with `schemaVersion: 1`:

- `Provider`: identity, kind, format, endpoint, transport, enabled state,
  model-list connection status, check timestamp, error and latency. **No key.**
- `Model`: provider relation, API model ID, display name, enabled state,
  nullable context and input/output prices, token limit field, sampling support.
- `Chat`: model, title, ordered messages, update timestamp and demo partition.
- `Message`: role, content and optional link to its request record.
- `RequestRecord`: source, immutable model/provider names, request/response,
  sanitized raw protocol, response headers, error, parameters, duration, TTFT,
  nullable usage, cost at call time and demo partition.
- `Settings`: language, theme, default provider/model, timeout, demo selection,
  onboarding state and request-history preference.

The separate `vault` record contains only `version`, `salt`, `iv`, and
ciphertext arrays. Decryption requires the user's password. The vault is not
part of a backup export.

Writes within one tab are queued. This release does not merge concurrent
edits across tabs. Retention is bounded at 5,000 requests and 500 chats. Charts
report retained history, not an external billing ledger. Demo records carry a
separate flag and never contribute to Live statistics.

## Adapter contract

`AIProvider` exposes `testConnection`, `listModels`, `chat`, `streamChat`,
`getUsage`, `estimateCost` and `buildRequest`. OpenAI-compatible providers share
one implementation; Anthropic and Gemini use their native payloads, auth,
stream events and token fields. Future adapters can reuse the orchestration.

Chat sends preceding messages on every follow-up. This is context within a
conversation, not cross-chat long-term memory. Editing a prompt discards the
later branch from the chat; request history retains earlier attempts.

Compare starts up to four independent requests concurrently. One provider
failure does not discard the other answers. Stop aborts all active requests.
Judge shuffles and anonymizes completed answers, sends a separate request,
and validates scored JSON before rendering it. Advisory ratings are not
benchmarks; prompt injection and judge bias remain possible.

## Desktop seam

Domain types, provider adapters and request orchestration do not import React.
Replace `LocalStoragePort` with SQLite and secret access with an OS-keychain
implementation for Tauri/Electron. Browser transport can be replaced with a
native HTTP client to remove browser CORS limitations. No desktop binary is
included in v1.
