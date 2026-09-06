# Run and deploy

## Requirements

Node.js 22.13+ and npm. The current verified build script uses Bash and GNU
`timeout`; Windows users should use **WSL2 Ubuntu** for building. `npm run dev`
uses Vite directly. No external SQL server or provider key is needed to start.

```bash
npm install
npm run dev
# Open the URL printed by Vite, normally http://localhost:5173
```

For reproducible CI installs use `npm ci`.

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:routes
npm start
```

This is a React application using Next.js App Router conventions, built with
**Vinext + Vite**, not the stock Next.js production server. The production
build emits a Cloudflare-compatible Worker at `dist/server/index.js` and
client assets. The application does not require D1 or R2.

## Private web hosting

The included build/hosting integration supports deployment of the Worker and
assets with Sites. The `.openai/hosting.json` identity belongs to the originating
instance; remove its `project_id` before registering your own hosted instance.
Never deploy a fork against someone else's project identity.

For another hosting provider, use a compatible Worker deployment or adapt the
runtime to the host. Do not upload the source directory to GitHub Pages and
expect the server relay to work. A public deployment must add authentication
and request-rate limits before allowing use of its relay. See `SECURITY.md`.

## Configuration

No server-side API key environment variable is consumed. `.env.example`
documents this intentionally. Add keys in the app's Providers view; optionally
enable the password-encrypted local vault in Settings.

Most provider keys cannot be used until the account has API access and credit.
A consumer chat subscription is not an API credential. Model-list access also
does not guarantee permission to generate with every listed model.

## Connection errors

| Error | Check |
| --- | --- |
| 401 | Correct provider/key; token not revoked |
| 403 | Account region, model entitlement and relay destination restrictions |
| 404 | Base URL path and exact model ID; some providers lack model-list APIs |
| 429 | Provider rate limit, credit and account quota |
| 400 | Disable custom sampling; check max_tokens vs max_completion_tokens |
| Network / CORS | Endpoint, VPN/proxy and allowed origin; try opt-in relay for official hosts |
| Timeout | Increase timeout up to 300s or reduce output budget |
| Empty response | Safety filtering, non-chat model or insufficient generation budget |

Provider catalogs may include embedding/image models; only text chat models
work in this release. Listed preset model IDs are editable examples.
