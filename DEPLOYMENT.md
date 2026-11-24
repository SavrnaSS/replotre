# Replotre Studio — deployment runbook

## Scope

Replotre v2 is designed for an **invite-only single-node deployment** on a VPS with Docker Compose, persistent block storage, TLS, and domain DNS. It is not suitable for stateless hosting that deletes the local filesystem on redeploy. Running two app replicas against the same SQLite/volume is unsupported.

## 1. Server prerequisites

- Linux host with 2+ vCPU, 4+ GB RAM (8 GB recommended for HD exports), available disk (allow 2–3× the size of uploaded videos for intermediate render work).
- Current Docker Engine and Compose plugin, internet access for image pulls and optional AI provider calls.
- Domain `studio.yourdomain.com` with A/AAAA DNS record to host public IP; ports 80/443 open.
- Separate backup destination and HTTPS-accessible monitoring.

## 2. Configure

```sh
cp .env.example .env
# Edit DOMAIN, SIGNUP_INVITE_CODE, and capacity/AI options.
docker compose config
```

Set `SIGNUP_INVITE_CODE` to a randomly generated secret (for example `openssl rand -base64 36`). Do not commit `.env`. If you enable public signup without verification, you are accepting a spam/abuse risk. The application deliberately requires an invite code when that variable is set.

Optional environment variables:

| Setting | Default | Description |
| --- | --- | --- |
| `DOMAIN` | required | Public DNS name; used by Caddy and server `APP_ORIGIN` |
| `OPENAI_API_KEY` | blank | Optional; enables speech transcription, sampled-frame understanding, and AI operation planning |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Optional responses-API model |
| `SIGNUP_INVITE_CODE` | blank | Recommended nonempty secret for initial launch |
| `ALLOW_SIGNUP` | `true` | Set `false` to disable all new registration |
| `MAX_FILE_MB` | `300` | Per-upload streaming cap |
| `USER_STORAGE_GB` | `2` | User's total media cap |
| `MAX_USERS` | `10000` | Total database account cap |

The Dockerfile uses Node 24 and FFmpeg from Debian Bookworm packages; Caddy manages automatic certificate renewal. External traffic reaches only Caddy, which forwards to the private app container.

## 3. Start and test

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100 app
curl -fsS https://studio.yourdomain.com/api/healthz
```

Perform a real smoke test: create an account with your invite code, upload a 5–10-second MP4, add a title, press **Save**, choose **Export video → MP4 (server)**, wait for completion and verify that the downloaded file plays with sound. Reopen the same cloud project after a page refresh and verify media playback.

## 4. Backups

The persistent Docker volume contains **both SQLite and all original/uploaded/rendered files**. You must back up the whole volume—not SQLite alone.

Run the script from the project folder:

```sh
./scripts/backup.sh
```

This pauses the app while an archive is taken, then resumes it. For a busy service, schedule a maintenance window and move backup logic to consistent snapshots. Store encrypted backups **outside your VPS** and test restoring to a separate staging host. Never put backups in publicly served paths. For restorations, stop the app first and restore into an empty dedicated volume, preserving filesystem permissions.

## 5. Monitoring and scaling

- Probe `GET /api/healthz` through public HTTPS; alert on failures and certificate expiration.
- Monitor free disk, CPU saturation, container restarts, per-user storage growth, and FFmpeg job failure rate.
- Use `docker compose logs app` for errors. Render job status is available per user in the Projects dialog/API.
- Scale by separating media into S3/R2, using PostgreSQL, moving render jobs to a queue/worker fleet, and enforcing plan/billing quotas **before** running multiple app replicas.

## 6. Updates and rollback

Before upgrading, run a backup. Redeploy with `docker compose up -d --build`. The server schema is currently initialized with `CREATE TABLE IF NOT EXISTS`; future schema changes must ship explicit migration scripts. Rollback should restore matching application code and a compatible database snapshot.

## 7. Do not skip before wide public launch

Add verified email ownership, password reset, signup abuse prevention, production monitoring and alerts, billing/usage policies if applicable, privacy/terms, a documented data deletion process, email provider, and capacity/load tests. Invite-only v2 is a smaller and safer first release.

## Current production (Railway)

- URL: **https://replotre.com** (Railway project `replotre-studio`, service `studio`, workspace "Xentra's Projects", Hobby plan). `www.replotre.com` 301-redirects to the apex (server-side canonical host). The old Next.js site (Vercel project `replotre`) is retired and has no domains.
- DNS (Vercel, team savrnass-projects): apex `ALIAS` → `morx10p5.up.railway.app`, `www` CNAME → `ik2owbni.up.railway.app`, TXT `_railway-verify` and `_railway-verify.www`. Leftover `studio` CNAME/TXT records can be deleted (Hobby allows 2 custom domains per service).
- Volume `studio-volume` (5 GB) is mounted at `/data` (SQLite + media). `RAILWAY_RUN_UID=0` lets the app write to it. Grow it from the volume's Settings → Live resize. Railway bills only for data stored.
- Variables mirror `.env`, plus `NODE_ENV=production`, `APP_ORIGIN=https://replotre.com`, `DATA_DIR=/data`, `PORT=4173`.
- Deploys: pushing to `main` on SavrnaSS/replotre auto-deploys through Railway's GitHub integration. `railway up --detach` from this folder still works for manual deploys, but move `.git` aside first: the CLI uploads it despite `.railwayignore` and times out. Third-party template previews are not in git; they live on the volume (`/data/templates`) and are served from there.
- Whop webhook "Replotre studio" → https://replotre.com/api/billing/webhook (verified with Whop's test event). The webhook and `/api/healthz` are exempt from the canonical-host redirect.
- `railway.json` is read until 2026-12-01. Do NOT apply `railway config migrate` output as generated: it omits `studio-volume`. Add the volume first, or keep settings in the dashboard.

## Continue with Google

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Railway (service `studio`). Create them in Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > Web application, with:

- Authorized JavaScript origin: `https://replotre.com`
- Authorized redirect URI: `https://replotre.com/api/auth/google/callback`

The OAuth consent screen needs the app name, support email and the `openid`, `email` and `profile` scopes (no Google verification is needed for these). Until both variables are set the button stays hidden. Sign-in uses the authorization code flow with PKCE and a signed state cookie; accounts are matched by Google ID, then by verified email (which links Google to an existing account).

## Search engine indexing and SEO

The public homepage, four feature pages, guides index, two editing guides, privacy policy and terms are rendered as HTML on the server. Their titles, descriptions, canonicals, Open Graph/Twitter previews, JSON-LD and sitemap entries come from `src/public-pages.mjs` and `src/seo.mjs`. Keep feature claims and guide instructions consistent with the actual application when changing these files. New public pages should be registered there and linked from a relevant page; do not create pages for unsupported features or duplicate keyword variations.

### Production configuration

- Set `NODE_ENV=production` and `APP_ORIGIN=https://replotre.com` on Railway, or set the public `DOMAIN` for Docker Compose. All absolute metadata and sitemap URLs use this origin, never the incoming Host header. Host aliases and old HTML paths redirect permanently to the canonical location.
- Public production pages are indexable by default. Set `SEO_INDEXABLE=false` on staging or preview deployments. Development is `noindex` by default; set `SEO_INDEXABLE=true` only to exercise the indexable behavior on a local audit server. A nonindexable deployment emits noindex page headers/meta and an empty sitemap, but allows crawlers to see those directives.
- Studio is always `noindex, follow`, and API responses are `noindex`. The robots file blocks API crawling while leaving Studio crawlable so search engines can read its noindex directive. Account authentication still controls access to private media and projects.
- Optional `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION` values add the ownership meta tags supplied by the respective webmaster tools. These are verification values, not API keys or Google OAuth client credentials. Docker Compose forwards both values. Use DNS verification instead if you prefer a domain-wide property.
- The generated structured data describes the actual organization, website, software, breadcrumbs and guides. It includes no invented reviews, ratings, prices, publication dates or search action. It does not promise a rich result.

### Launch checks and submission

1. Deploy the source changes using the existing Railway/GitHub workflow. Keep `APP_ORIGIN` set to the public origin and confirm `SEO_INDEXABLE` is not false.
2. Run `npm run test:seo` locally for isolated HTTP tests, or run `npm run seo:audit -- https://replotre.com` from this source checkout after deployment. The latter is read-only: it checks every public page, canonical metadata, structured data, linked pages/assets, sitemap, robots, studio exclusion and true 404 responses. Local audit targets must be started with `SEO_INDEXABLE=true`; ordinary development correctly fails an indexability audit.
3. Verify the property in [Google Search Console](https://search.google.com/search-console) and [Bing Webmaster Tools](https://www.bing.com/webmasters/). Use the owner's account to complete verification. No submissions or ownership changes happen automatically in this application.
4. Submit `https://replotre.com/sitemap.xml` in both tools. Inspect the homepage and representative feature/guide URLs in Search Console, check the canonical and indexing result, and request indexing for the main pages where appropriate. A sitemap helps discovery; submission does not guarantee crawling, indexing or ranking.
5. Check the rendered pages on a phone and desktop. Run PageSpeed Insights on representative public pages after deployment and use Search Console's Core Web Vitals report once enough real usage data is available. The new content pages use local fonts and need no client-side application bundle; the homepage demo loads its primary videos as metadata until playback needs them.

### Ongoing search work

Review Google Search Console and Bing reports for indexing failures, queries, impressions, clicks and page performance. Improve existing guides around questions users actually ask, add original examples or product demonstrations, and earn relevant links through useful public material. Keep the product, pricing and privacy claims accurate. Compare changes over several weeks using the search reports; do not treat a successful technical audit as proof of rankings or traffic.

References: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing) and [structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

## Complimentary access

The studio requires an active Creator or Pro plan. To let specific people in without paying (the owner, testers), set `STUDIO_FREE_ACCESS_EMAILS` on Railway to a comma-separated list of account emails. They get Pro limits and show as "Pro (complimentary)". Remove an email to end their access.
