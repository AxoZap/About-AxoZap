# Internship tracker

The site at `internships.axozap.com` is protected by the **Internship Tracker** Cloudflare Access application. All browser data requests use the same-origin `/api/internships` Pages Function. That Function forwards the Access JWT to the backend Worker, which verifies the JWT signature, issuer, and application audience before any D1 query or mutation. The public `workers.dev` URL also requires that JWT. `/health` remains public and contains no internship data.

The Worker configuration in `worker/wrangler.jsonc` contains the non-secret Access team domain and application audience. If the Access application is recreated, update its audience in that file before deploying. Do not add an `ADMIN_PASSWORD`: the old optional password path was removed because it allowed writes when the secret was absent.

Deploy the Worker with `cd worker && npm ci --legacy-peer-deps && npm run deploy`. Push the `Internships` changes to the repository's `main` branch to trigger the existing Cloudflare Pages Git deployment. Deploy both parts together: the site now calls `/api/internships`, and the Worker now requires the JWT forwarded by that route.

## Later ChatGPT access

The existing authenticated `GET /api/internships` is the read-only data source for a future MCP connector. Implement a small MCP server with a `list_internships` tool and OAuth user authorization for ChatGPT. Keep the MCP server's credential to the upstream API on the server; do not put it in browser code or ask ChatGPT to send a shared admin password. Give the MCP server read-only access, a separate credential and audit trail, and add write tools only if explicitly needed.

ChatGPT custom MCP connections support OAuth for private user data. A Cloudflare Access service token alone is not a direct ChatGPT OAuth login: the MCP server must handle ChatGPT's OAuth flow and use its own server-side authorization to reach the tracker. This connector is intentionally not exposed yet; the current API and Access checks can serve as its backend once its OAuth identity and scope are chosen.

- Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/
- ChatGPT custom MCP server: https://developers.openai.com/api/docs/guides/custom-mcp-server
- ChatGPT authentication requirements: https://developers.openai.com/plugins/build/auth
