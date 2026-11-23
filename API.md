# Replotre API v2

All routes start with `/api/`. Browser-changing requests require `X-Replotre-Client: studio`; requests with an `Origin` header must match configured `APP_ORIGIN`. Authentication uses secure, HttpOnly, SameSite=Strict `rp_session` cookies. API responses are JSON except authorized media downloads.

| Method | Route | Description |
| --- | --- | --- |
| GET | `/healthz` | Health check |
| GET | `/status` | Login and capability flags: realtime, analysis, director, transcription, vision, MP4 |
| GET | `/events` | Authenticated SSE; optional `Last-Event-ID` or `?since=` for replay |
| POST | `/auth/register` | `{email,password,inviteCode?}` (12+ char password) |
| POST | `/auth/login` | `{email,password}` |
| POST | `/auth/logout` | Revoke current session |
| POST | `/auth/password` | `{currentPassword,newPassword}`; revokes all sessions |
| GET | `/auth/me` | Current user or null |
| GET | `/workspace` | Private last-opened project and its saved UI state |
| PUT | `/workspace` | `{projectId,state,activate?}`; save workspace preferences without changing the timeline |
| GET | `/usage` | User storage/AI limits |
| GET | `/projects` | Current account's projects |
| POST | `/projects` | `{data: projectSnapshot}` |
| GET | `/projects/:id` | Project data, asset list, and this account's saved `workspace` |
| PUT | `/projects/:id` | `{version,data}`; optimistic lock, 409 on conflict |
| DELETE | `/projects/:id` | Delete project, files and renders |
| GET | `/projects/:id/assets` | Project assets |
| POST | `/projects/:id/assets?name=clip.mp4` | Binary body, matching `Content-Type`, streamed to disk |
| GET/HEAD | `/projects/:id/assets/:assetId` | Authorized media stream (supports Range) |
| DELETE | `/projects/:id/assets/:assetId` | Delete unreferenced asset |
| GET | `/projects/:id/renders` | Recent MP4 jobs |
| POST | `/projects/:id/renders` | `{resolution:720\|1080}`; returns queued job |
| GET | `/renders/:id` | Private render status and progress |
| GET/HEAD | `/renders/:id/file` | Authenticated completed MP4 download |
| GET | `/projects/:id/intelligence` | Analysis summaries, recent tasks, and renders |
| GET | `/projects/:id/assets/:assetId/analysis` | Full private scene/audio/transcript/vision analysis |
| POST | `/projects/:id/assets/:assetId/analysis` | `{kind:"analyze"|"transcribe"|"understand"}`; returns persistent task |
| GET/HEAD | `/projects/:id/assets/:assetId/frames/:index` | Private sampled JPEG frame |
| GET | `/tasks/:id` | Task state, actual stage, and progress |
| POST | `/tasks/:id/cancel` | Cancel queued or running analysis |
| POST | `/tasks/:id/retry` | Retry failed/cancelled analysis as a new task |
| POST | `/projects/:id/director` | `{version,prompt?,operations?,selectedClipId?,playhead?,clientId?}`; atomic saved edits |
| GET | `/projects/:id/revisions` | Up to 50 saved timeline versions |
| POST | `/projects/:id/revisions/:version/restore` | `{version:currentVersion,clientId?}`; restores as a new version |
| GET | `/projects/:id/subtitles.srt` | Download saved caption layers as SRT |
| GET | `/projects/:id/subtitles.vtt` | Download saved caption layers as WebVTT |
| POST | `/renders/:id/cancel` | Cancel queued/running MP4 encode |
| POST | `/renders/:id/retry` | New job using the original saved export snapshot |
| POST | `/ai` | `{prompt, project}`; optional external AI planner, authenticated and rate-limited |

Projects reference media using `mediaId` values returned by the upload API. A saved project cannot reference files from another account or from another project.

- `400`: invalid data; `401`: not logged in; `403`: wrong origin/client header; `404`: not found or unauthorized object; `409`: version conflict/referenced asset; `413`: size/quota reached; `415`: unsupported file format; `422`: invalid media content; `429`: rate limited; `502/503`: service unavailable.
- Actual FFmpeg render currently allows a maximum five-minute composition, 120 video/image clips, 1080p output. The browser can also export WebM locally.


## Workspace recovery

Workspace settings use their own storage, separate from project data, optimistic timeline versions and undo history. Both workspace routes require authentication; saving also requires the standard client and Origin checks. Project ownership is validated on every write. A request is limited to 12 KB and 180 writes per account per minute. Unknown settings are discarded, invalid values fall back to safe defaults, and numeric values are bounded. Deleting a project removes its workspace and clears it as the last-opened project.

```json
{"projectId":"<owned-project-id>","activate":true,"state":{"version":1,"tool":"templates","rightTab":"ai","mobileSection":"studio","assetsCollapsed":false,"rightCollapsed":false,"playhead":3.5,"zoom":1,"viewerZoom":"fit","selectedClipId":null,"selectedTextId":null,"selectedCutId":null,"scroll":{"assets":240,"timeline":0,"filters":0},"templates":{"filter":"captions","query":"Interview","view":"grid"}}}
```

`GET /api/workspace` returns `{workspace:{projectId,state,updatedAt,activeAt}}`; `projectId` and `state` are null before a workspace has been saved. `PUT` returns `{workspace:{projectId,state,updatedAt}}`. `activate: true` marks the project as last opened. Background preference saves omit it so that an inactive tab does not replace the active-project pointer. `GET /api/projects/:id` also returns `workspace: {state,updatedAt} | null`.

The browser restores its own tab/device state first, then uses the private saved workspace when a project has no local preferences. Separate tab records preserve independently opened projects. Preferences save locally immediately after navigation and are debounced to the server. Failed preference sync leaves local recovery available and retries on subsequent interactions, focus, or reconnection. Playback always resumes paused. A remote timeline update retains the current workspace and clamps its playhead and selection to the updated timeline.

## Templates

`POST /api/projects/:id/template` lays a creative template out against the saved timeline and returns a sanitized template instance. The client stores it in the project as `data.template` (validated by `validateProject`) and writes the template grade onto each clip.

```json
{"mode":"apply","templateId":"crimson","brief":"punchier copy","engine":"claude","frames":true}
{"mode":"create","brief":"moody neon night drive, keyword behind me on the beat"}
```

- `mode: "apply"` fits a catalog template (`templates-catalog.js`). With `ANTHROPIC_API_KEY` set and `engine` not `"local"`, Claude (`ANTHROPIC_MODEL`, default `claude-opus-5-5`) writes copy, timing, accent colours and element choices from the transcript, beat grid, scene cuts, frame descriptions and up to three sampled frames. Without a key it uses the local layout, still grounded in transcript words and beats.
- `mode: "create"` asks Claude to design an original look; it returns 503 when Claude is not configured.
- Caption word timings and keyword/flash beat grids are always attached from analysis on the server, never taken from the model.
- Response: `{template, engine:"claude"|"local", message, model?, grounding:{words,beats,scenes,frames}}`. Claude requests count toward the daily AI quota and a 12/minute rate limit.

Template motion layers render on the preview canvas and in browser (WebM) export. The server MP4 render includes the template grade and regular text layers.

## Account and billing

- `GET /api/account`: user, onboarding profile (`step`, `onboardedAt`), effective plan, subscription, entitlements and usage.
- `PUT /api/account/profile` `{profile, step, complete}`: validated partial update. `step` only moves forward, and `complete:true` sets `onboardedAt`.
- `GET /api/billing/plans` (public): plans, limits, features, billing mode (`stripe`, `test` or `off`).
- `POST /api/billing/checkout` `{plan, interval:"month"|"year"}`: returns a Whop `purchase_url` to redirect to (Whop redirects back to `/studio?billing=success`). In test mode it returns the updated `account`. Active Whop subscribers get `409` and cancel first.
- `POST /api/billing/refresh`: re-reads the user's Whop membership and returns the account. Used after checkout and when returning from Whop.
- `POST /api/billing/portal`: the membership's Whop `manage_url` (card updates, receipts).
- `POST /api/billing/cancel` `{resume?:true}`: Whop cancel at period end, or undo it.
- `POST /api/billing/webhook`: Whop events. Verified with Standard Webhooks headers (`webhook-id`, `webhook-timestamp`, `webhook-signature`) using `WHOP_WEBHOOK_SECRET`, and deduplicated by `webhook-id`. Membership state is re-read from the Whop API when a key is configured.
- Limit errors: `402 {error, feature}`, where `feature` is one of `ai`, `export`, `export-length`, `upload`, `storage` or `projects`.

## Director operations

Every operation has a `type`. Supported operations: `set_aspect`, `add_text`, `set_text_color`, `set_text_position`, `remove_text`, `trim_clip`, `split_clip`, `set_speed`, `set_volume`, `remove_music`, `generate_script_captions`, `auto_captions`, `remove_silence`, `split_scenes`, `beat_sync`, `highlights`, `fit_duration`, `set_grade`, and `set_caption_style`. See `src/director.mjs` for the validated schemas.

The Director reads the saved, authorized project and cached source analysis. It never executes model-generated code. Any invalid operation fails the complete request without saving a partial result. Missing required source analysis or transcripts return 409; stale versions also return 409. Explicit `operations` work without an AI provider; natural-language planning uses local commands when no provider is configured.

## Live events

Events include `ready`, `reset`, `project.updated`, `project.deleted`, `asset.created`, `asset.deleted`, `analysis.updated`, `task.updated`, `render.updated`, and `director.status`. Payloads are scoped to the authenticated account. `project.updated` includes project metadata and a `clientId` echo to identify a tab's own saves. No session tokens, provider credentials, media bytes, or full transcripts are sent through events.

The stream retains a bounded replay window (up to 24 hours and around 10,000 recent global events). Clients must reconcile server state after `reset` or reconnect; replay is not permanent event storage. Up to eight stream connections are allowed per account.
