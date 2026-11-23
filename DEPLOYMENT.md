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
- Deploy from this folder: `railway up --detach`. `.railwayignore` keeps `.env` and `data/` out of uploads.
- Whop webhook "Replotre studio" → https://replotre.com/api/billing/webhook (verified with Whop's test event). The webhook and `/api/healthz` are exempt from the canonical-host redirect.
- `railway.json` is read until 2026-12-01. Do NOT apply `railway config migrate` output as generated: it omits `studio-volume`. Add the volume first, or keep settings in the dashboard.
