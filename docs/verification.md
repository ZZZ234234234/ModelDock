# Verification — 2026-09-05

## Automated checks

- Strict TypeScript: passed.
- ESLint: passed.
- 18 executable core tests: passed. Tests use protocol fixtures and a mocked persistence port; no paid provider requests were made.
- Production Worker/assets build: passed.
- All 10 production page routes returned HTTP 200 with ModelDock HTML: passed.

Coverage includes OpenAI-compatible, Anthropic and Gemini wire formats and streaming; UTF-8 chunk boundaries and multiline SSE; final usage; incomplete stream detection; unknown vs zero cost; redaction; restricted relay destinations; CSV formula neutralization; demo cancellation; and actual WebCrypto encryption/decryption with wrong-password rejection and concurrent writes.

Run the checks yourself:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run test:routes
```

## Browser observations

The running desktop dashboard was visually inspected and its real screenshot is in `screenshots/dashboard.jpg`. The demo onboarding and a complete streamed demo chat were exercised successfully. The displayed answers, prices and tokens are explicitly simulated.

Further browser navigation to Compare was blocked by the verification environment's URL policy. Compare, Settings, History and responsive layouts have not completed interactive end-to-end browser QA. Their implementation and server routes are checked separately. The source includes responsive breakpoints, but this is not a claim that real mobile devices were tested.

## Practical limits

- No real provider credentials were available. Provider entitlement, CORS, region-specific endpoints and paid inference need verification with the user's own account.
- Local Ollama/LM Studio detection must run on the same computer as that local model server; this environment has neither installed.
- The encrypted vault and clipboard require HTTPS or localhost. The vault's cryptography was tested with WebCrypto and a mocked storage port; an insecure HTTP preview cannot exercise that secure browser capability.
- Browser direct mode sends keys to the configured endpoint. The optional relay also receives them transiently. Public self-hosted deployments need authentication and rate limiting.
- AI Judge is experimental. Valid JSON structure does not establish factual accuracy. Demo mode returns explicitly simulated content rather than pretending to have measured a real model's ability.
- Model discovery currently reads the first catalog page. Add additional IDs manually where pagination or a provider-specific catalog is needed.
- Text-only v1: no images, files, tools or arbitrary multi-modal response parsing.
- Configuration and chat data are browser-local. Use one active tab to avoid last-write-wins conflicts; export a backup before clearing site data.
