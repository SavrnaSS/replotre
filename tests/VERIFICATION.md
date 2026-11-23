# Studio 2 verification

## Workspace recovery — 2026-11-22

- Six workspace tests pass for schema recovery, all tool states, account/project isolation, independent timeline revisions, deletion cleanup, and persistence after a database restart (`node --test tests/workspace.test.mjs`).
- Fourteen interaction scenarios pass with the real studio scripts in Happy DOM: refresh/reinitialization, Templates search/category/list view, playhead and selection, default/corrupt storage, blocked local storage with session recovery, the mobile tool drawer, last-opened cloud project, independent tabs, project switching, live timeline updates, a delayed Templates rerender after switching tools, reconnect activation, failed sign-out recovery, and startup restoration of all nine populated tool panels. These tests use media/canvas stubs and a mock cloud API; they verify application behavior, not browser rendering.
- Twenty-four live HTTP checks pass against the running local server through curl, covering authenticated workspace recovery, project ownership, CSRF client headers, schema/method rejection, malformed request bodies, last-opened versus background saves, unchanged timeline revisions, and project-deletion cleanup. Disposable QA accounts and their projects were removed afterward.
- Existing regression checks pass: 24 core playback/media/editing tests, three template validation/timing tests, and three theme tests. JavaScript syntax checks and serving the new workspace script also pass.
- Browser screenshots and real browser playback remain unverified because the in-app browser runner is unavailable and native Chromium launch is restricted in this sandbox. The complete HTTP integration suite still requires a host that allows Node to bind temporary local ports.

## Earlier verification — 2026-11-17

- `npm run test:core`: **11 passing tests**, including generated real footage, scene/silence analysis, measured waveforms, timestamp mapping, atomic editing, mixed video/image/music MP4 rendering, provider-adapter mocks, private event replay, quota deduplication, and restart recovery.
- Live server verification through curl: **34 passing checks**, covering private accounts/projects/analysis/exports, automatic analysis, silence removal and ripple timing, scene edits, version conflicts/restores, subtitle downloads, live events and replay, and MP4 cancellation/retry.
- The retried export was downloaded and inspected with FFprobe: **H.264 video, AAC audio, 4.000-second duration**, preserving the submitted four-second snapshot after the live timeline was shortened to one second.
- DOM interaction verification: **17 passing checks**, including late-loaded cloud initialization, Insights actions, measured waveforms, source navigation, undo/save, cancellation, version restore, transcript search/focus during updates, cached captions, Director chat, remote synchronization, and explicit conflict resolution. No uncaught application errors were observed. This uses an emulated DOM with canvas/media stubs and a mock API; it is not browser rendering evidence.
- JavaScript syntax checks passed. The running `/api/healthz` reports `2.0.0`; versioned frontend assets return HTTP 200.
- Disposable live-test accounts, their project, uploads, analysis frames, and server exports were removed after verification.

## Verification limits

The full HTTP integration suite could not run successfully inside this sandbox because Node TCP binding/connections were denied. The running local server remained accessible through curl and was used for the live checks above. Run `npm test` on a host that permits temporary local HTTP servers.

Chromium launch was denied by system Mach-port permissions, so screenshots, responsive layout rendering, actual browser playback, and browser WebM export were not verified for this upgrade. Earlier design screenshots do not verify the new Insights layout.

No real AI credential was configured. Speech/vision adapters were tested with explicit mock provider responses and real extracted media. Live provider authentication, recognition quality, and sampled-frame descriptions still require configured `OPENAI_API_KEY` credentials and a real-media acceptance check.
