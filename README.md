# Replotre Studio 2.1

A realtime video editing workspace built around your source footage. The existing Cutroom editor now has persistent analysis jobs, source-aware editing tools, speech captions, version history, and live project/export updates.

## What works

- **Live workspace:** authenticated Server-Sent Events, reconnect/replay, cross-tab project synchronization, optimistic saves, and an explicit conflict resolver that preserves unsaved work.
- **Footage intelligence:** automatic FFmpeg analysis after cloud uploads; actual scene boundaries, source thumbnails, measured audio waveforms, quiet intervals, audio onset markers, and an estimated BPM when the timing is consistent.
- **Working editing tools:** remove detected silence, split at scene boundaries, trim cuts to soundtrack onsets, build representative scene/speech highlights, apply color presets, and edit by Director chat. Changes are applied and saved on the server. Text layers are retimed through ripple and speed edits.
- **Speech captions:** extract source audio, request real word/segment timestamps from the speech provider, search transcript passages, seek to source moments, and build captions that respect source trims, clip order, and playback speed. Download SRT or WebVTT.
- **Visual understanding:** explicitly request descriptions and tags from sampled source frames. This does not claim every-frame understanding.
- **History:** retain up to 50 saved timeline versions; restore any retained version as a new save. Local undo/redo works for Director edits too.
- **Real exports:** FFmpeg H.264/AAC MP4 at 720p/1080p, up to 120 clips and five minutes; measured progress, cancellation, snapshot-preserving retry, and private downloads. Browser WebM export remains available.
- **Durable private workspace:** password accounts, SQLite WAL, private range-streamed media, streamed upload limits, storage quotas, and Docker/Caddy deployment.

## Playback

Preview uses native video players with media-clock timing and next-clip preloading. Captions are cached separately, background analysis avoids rebuilding the timeline during playback, and paused previews stop their animation loop. Browser recording retains video/audio compositing and pauses while a source is buffering. See [playback verification](tests/PLAYBACK_PERFORMANCE.md) for the tested behavior and browser-testing limits.

## Run

Requirements: Node.js **22.16+** (Node 24 recommended), FFmpeg, and FFprobe. Run `npm install` once; the only runtime dependency is the Anthropic SDK, used for Claude templates.

```sh
npm start
```

Open **http://localhost:4173** for the landing page, or go straight to the editor at **http://localhost:4173/studio**. `npm run dev` watches server changes. Both commands read `.env` when it exists. Existing databases are upgraded additively; projects and uploaded files are preserved.

1. Sign in or create an account using **Sign in · Cloud**.
2. Import your actual footage and an optional soundtrack. Local analysis starts automatically.
3. Open **Insights** in the tool rail. **Edit** contains working editing actions; **Footage** contains scenes, thumbnails, audio, and transcripts.
4. Use **Director** for natural-language editing or the action buttons for explicit operations.
5. Follow analysis and exports in **Jobs**, restore edits in **History**, and export from the header.

Unsigned users retain the device-local editor. Server analysis, live synchronization, and MP4 rendering use an authenticated cloud project.

The studio remembers the active tool after refresh, including Templates search, category and grid/list view, inspector tab, panel layout, scroll position, playhead, and selection. Local preferences restore first; signed-in users also get a private saved workspace per project and return to their last-opened project. Workspace settings do not create timeline revisions or undo steps. Invalid or unavailable storage falls back safely, and playback returns paused. Existing databases gain the workspace tables automatically on startup.

## Templates

Open **Templates** in the tool rail (or **Gallery** for the full-screen view) and choose a look such as Crimson Studio, Candlelit, Motion Deck, Beat Keyword or Hero Float. A template applies a grade, a backdrop treatment and timed motion elements: kinetic headlines, keywords that swap on the beat, frosted-glass and phone cards, karaoke or highlight captions, progress steps, counters, light streaks, lower thirds, film grain, light leaks and letterbox. Every element is editable in the panel, and applying or removing a template is a single undo step.

Templates marked **Depth** place type behind the person and can replace the background with a studio colour. This uses an on-device MediaPipe selfie segmenter vendored in `vendor/mediapipe/` (Apache-2.0), so no frames leave the browser.

To let Claude fit templates to your footage or design new looks from a description, add the following to `.env` and run `npm install`:

```dotenv
ANTHROPIC_API_KEY=your-server-side-key
ANTHROPIC_MODEL=claude-opus-5-5
```

Claude receives the transcript, beat and scene timing, frame descriptions and up to three sampled frames, and returns a structured plan that the server validates. Without a key, templates still lay out locally. Template motion layers export with **WebM** (browser export); MP4 renders include the grade and text layers.

## Accounts, onboarding and plans

New accounts go through a six-step setup (about you, what you make, default look, workflow, plan, ready). Answers are saved on the server after every step, so setup resumes where it stopped, and they shape the studio: default frame, caption style and pinned templates. The header chip reopens setup or the account centre (overview with usage meters, plans, billing and invoices, profile, security).

Plans are Free, Creator and Pro (see `src/account.mjs`). The server enforces each plan's limits: daily AI requests, storage, upload size, export resolution, video length and project count. A request over a limit returns `402` with a `feature`, and the studio opens the plans sheet with the reason.

Payments go through **Whop**. The server creates a Whop checkout for the chosen plan, carrying the Replotre user id as metadata. Whop's membership webhooks then activate, renew, flag failed payments on, schedule cancellation of, or end the plan. Subscribers update cards and download receipts on their Whop billing page (**Billing → Manage on Whop**), and can cancel or resume in the app.

1. In Whop, create a product with four plans (Creator and Pro, each monthly and yearly). Copy each plan id (`plan_…`).
2. Create an API key at whop.com/dashboard/developer with `checkout_configuration:create`, `member:basic:read`, `member:manage` and `membership:cancel`.
3. Add a webhook to `https://YOUR_DOMAIN/api/billing/webhook` for the `membership.*` and `payment.succeeded`/`payment.failed` events, and copy its `ws_…` secret.
4. Fill in `.env` and restart:

```dotenv
WHOP_API_KEY=...
WHOP_WEBHOOK_SECRET=ws_...
WHOP_ACCOUNT_ID=biz_...            # optional when the key belongs to one business
WHOP_PLAN_CREATOR_MONTHLY=plan_...
WHOP_PLAN_CREATOR_YEARLY=plan_...
WHOP_PLAN_PRO_MONTHLY=plan_...
WHOP_PLAN_PRO_YEARLY=plan_...
```

For sandbox testing, use keys and plans from sandbox.whop.com and set `WHOP_API_BASE=https://sandbox-api.whop.com/api/v1` (test card `4242 4242 4242 4242`). Without `WHOP_API_KEY`, non-production servers run in **test mode**: plans switch instantly and nothing is charged (set `BILLING_TEST_MODE=false` to disable). Production servers without a key show payments as unavailable. To change plans, a Whop subscriber cancels the current plan first. This avoids double billing.

## Connect speech and visual AI

Scene/audio analysis and explicit editing tools work without an external AI key. For transcription, visual descriptions, and flexible language planning, add the following to `.env` and restart the server:

```dotenv
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-4.1-mini
```

Credentials stay on the server. Upload analysis uses local FFmpeg only; source audio/frames are sent to the AI provider only when you request transcription or visual understanding. Director prompts can include saved transcript and frame-description context. Provider actions share a daily per-account request quota.

The speech adapter uses `whisper-1` with `verbose_json` and word/segment timestamps ([provider documentation](https://developers.openai.com/api/docs/guides/speech-to-text)). This timestamp API is currently supported until February 26, 2027; migrate the adapter when a replacement with equivalent timing support is available. No transcript is synthesized when the provider is absent or a job fails.

## Verify

```sh
npm test
# Core media pipeline and editing tests without opening HTTP ports:
npm run test:core
```

The tests generate real video, image, and audio files, analyze scenes/silence, render and inspect MP4 output, verify ripple/caption timing, and check access controls, live replay, revisions, and cancellation/retry. Provider-adapter tests use an explicit mock; live provider calls require real credentials. Full integration tests start a temporary HTTP server; `test:core` works where local port binding is restricted.

## Deployment and operating limits

Use [DEPLOYMENT.md](DEPLOYMENT.md) for Docker Compose, HTTPS, configuration, and backups. This application requires a persistent Node/FFmpeg server and disk; a static host or Cloudflare Worker cannot run this architecture.

Processing runs on one server, with one analysis task and one MP4 encode at a time. Queued jobs resume after a restart; interrupted active jobs become retryable failures. The stream synchronizes tabs belonging to the same account; organization/team collaboration is not implemented. Music cuts use detected amplitude onsets, and highlight selection uses representative scene/speech excerpts rather than semantic quality ranking. Caption preview/export font rendering may differ. Sample artwork is for local preview and cannot be rendered as uploaded server footage.

Email verification/recovery, billing, organization roles, semantic search, reference-style transfer, and distributed render workers remain future work. Configure backups, storage retention, and monitoring before onboarding customers.

See [API.md](API.md), [ARCHITECTURE_AND_ROADMAP.md](ARCHITECTURE_AND_ROADMAP.md), and [SECURITY.md](SECURITY.md).
