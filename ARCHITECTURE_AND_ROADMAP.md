# Replotre Studio 2 architecture

```text
Browser: app.js + cloud.js + intelligence.js
  ├─ Canvas preview, editable timeline, local undo and WebM export
  ├─ Intelligence: source inspection, editing actions, jobs and history
  ├─ Version-checked saves and conflict recovery
  └─ EventSource: authenticated live updates and reconnect replay
                    │
                Caddy TLS
                    │
Node.js server.mjs (one application process)
  ├─ Private accounts, ownership checks, upload/rate/storage limits
  ├─ SQLite WAL
  │    users / sessions / projects / assets / project_revisions
  │    tasks / media_analysis / renders / ai_usage / events
  ├─ AnalysisQueue → FFprobe / FFmpeg
  │    audio PCM → RMS waveform / silence / onset markers
  │    scene boundaries → private sampled JPEG frames
  ├─ Optional provider → timestamped transcription / sampled-frame descriptions
  ├─ Director → bounded operations → validation → atomic versioned commit
  └─ RenderQueue → saved snapshot → FFmpeg H.264/AAC MP4
```

## Realtime and consistency

`EventHub` persists small account-scoped events before delivery. EventSource reconnects with `Last-Event-ID`; missed events are replayed, or the client receives a reset and reconciles current project/job state. Connections are limited per account and recheck session validity during heartbeat. Exports and analysis continue independently of the panel's lifecycle.

Project saves, Director operations, and revision restores share `commitProject`. A single SQLite transaction checks the expected version and records timeline history. Source media is checked against the project. Remote edits update idle tabs; dirty tabs retain their local timeline and require explicit conflict resolution. Provider latency cannot silently overwrite a newer save.

## Source-aware edits

Source times and timeline times are distinct. Silence removal produces retained source ranges; a mapping retimes text overlays through cuts and speed changes. Transcribed words are intersected with each clip's trim and mapped through its playback speed. Scene cuts preserve source boundaries. Beat cuts shorten clip ends to measured soundtrack onsets. Highlight assembly uses representative source scenes or transcribed segments; semantic ranking is not implemented.

## Job lifecycle

Analysis and render rows persist queue state. Workers process one job each at a time. Cancellation marks a terminal state before aborting media processes. Render retries retain the original timeline snapshot. Queued jobs are recovered at startup; interrupted active jobs fail with a retry explanation. Project/asset deletion cancels related work and removes private outputs.

Local FFmpeg analysis is automatic. Provider transcription and vision require explicit user actions and configured server credentials. Provider responses are bounded and structured; edit operations are validated before any save.

## Next infrastructure work

- Organizations, roles, shared projects and review/approval flows.
- Email verification/recovery and account lifecycle controls.
- Metered billing, retention policies and operational dashboards.
- Semantic footage indexing and higher-quality music/beat tracking.
- PostgreSQL/object storage and independent distributed render workers.

The current architecture is deliberately a persistent, single-server application. Realtime UI behavior does not imply horizontal scalability or complete feature parity with another product.
