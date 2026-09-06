# Contributing to ModelDock

Thanks for helping make multi-model workflows better.

1. Open an issue for substantial behavior or architectural changes.
2. Fork the repository and create a focused branch.
3. Use Node.js 22.13+ and install with `npm ci`.
4. Run `npm run dev`. Demo mode needs no credentials.
5. Before opening a PR, run:

   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   npm run test:routes
   ```

Keep provider behavior in `src/providers`, storage behind the local storage port,
and UI in `src/features` or shared components. Preserve strict TypeScript.
Add both Chinese and English labels. Test protocol changes with deterministic
fixtures. Include screenshots for visible changes and exact reproduction steps
for bug fixes. Never include keys, private conversations, browser exports, or
`.env` files in an issue, fixture or commit.

Adding a provider usually needs a catalog preset and a compatibility check.
A new wire format should implement `AIProvider` and normalized usage fields;
it should not change the chat or comparison orchestration.

## Scope

The first release targets a personal, text-only, local-first workbench.
Before adding a database, telemetry, cloud sync, tools or account system,
discuss the privacy and maintenance implications.
