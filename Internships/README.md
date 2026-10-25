# Internship tracker

The site at `internships.axozap.com` is protected by the **Internship Tracker** Cloudflare Access application. All browser data requests use the same-origin `/api/internships` Pages Function. That Function forwards the Access JWT to the backend Worker, which verifies the JWT signature, issuer, and application audience before any D1 query or mutation. The public `workers.dev` URL also requires that JWT. `/health` remains public and contains no internship data.

The Worker configuration in `worker/wrangler.jsonc` contains the non-secret Access team domain and application audience. If the Access application is recreated, update its audience in that file before deploying. Do not add an `ADMIN_PASSWORD`: the old optional password path was removed because it allowed writes when the secret was absent.

Deploy the Worker with `cd worker && npm ci --legacy-peer-deps && npm run deploy`. Push the `Internships` changes to the repository's `main` branch to trigger the existing Cloudflare Pages Git deployment. Deploy both parts together: the site now calls `/api/internships`, and the Worker now requires the JWT forwarded by that route.

Cloudflare Access JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/

The small **SQL** button in **Add Application** reveals a SQL editor. Its `/api/sql` endpoint verifies Access and permits only the configured `SQL_OWNER_EMAIL`, from `SQL_ALLOWED_ORIGIN`. Multiple ordinary SQLite statements run together as an atomic batch; query output is capped at 100 displayed rows per statement. Use the D1 console for trigger definitions. Run the local endpoint tests with `cd worker && npm test`.
