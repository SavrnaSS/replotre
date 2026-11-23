# Playback changes — Studio 2.1

The old preview advanced a separate wall clock, repeatedly sought the source when it fell behind, copied video into a canvas on every animation frame, and continued drawing while paused. The playback loop also rebuilt text layout/shadows and wrote layout-affecting playhead positions repeatedly.

## Implemented

- `playback.js` uses decoded media time for video clips. Buffering holds the timeline and soundtrack instead of forcing catch-up seeks.
- Two native video elements share the preview. The next cut is loaded and sought in advance; adjacent, continuous ranges reuse the active decoder.
- Preview video displays directly through native video elements. The transparent canvas contains captions and titles. Full video compositing is retained for browser recording.
- Video-frame callbacks drive overlay updates where available, with a bounded fallback. A paused preview has no continuous animation loop.
- Text is rasterized into a bounded eight-entry cache. Stable overlays are not repainted for every decoded frame.
- Transport DOM nodes are retained, unchanged labels are not rewritten, and playhead movement uses a transform. Pointer movement is coalesced, and pending decoder seeks retain only the latest requested position.
- Analysis results update in memory during playback; timeline reconstruction waits for pause. Job progress updates the existing row instead of rebuilding source thumbnails and transcript content.
- FFmpeg analysis decoding/filter threads are bounded. Temporary metadata players release their sources, and project switches release old local object URLs.
- Both players feed browser-recording audio. Recording pauses during buffering and resumes with footage, preserving the timeline timing.

## Verification

`npm run test:core`: **24 passed**, including 13 playback regressions for buffering, preload, continuous/discontinuous cuts, speed/audio mapping, rapid seeks, a 120-cut montage, visibility, property edits, and unresolved play promises. Existing real FFmpeg media-analysis and MP4-rendering tests also pass.

The app-level DOM/media harness passed **28 checks**. It confirms zero video-to-canvas copies during normal preview, no idle redraw loop, retained timeline nodes during analysis updates, progress-row updates, bounded scrubbing, and the recording compositing/audio path. Its clock, decoded media, canvas, and recorder are simulated; it does not establish hardware FPS or validate an encoded browser WebM file.

The running server reports **2.1.0**. Versioned playback/app/CSS assets are included in the HTML and the new playback script returns HTTP 200.

Browser rendering and actual-device dropped frames remain unverified because the in-app browser execution tool is unavailable and the environment previously denied Chromium launch. The Node HTTP integration suite has the same sandbox socket restrictions documented in `VERIFICATION.md`.

For an actual browser session, `ReplotreEditor.playbackStats()` reports source loads/seeks, native frame counters when supported, canvas paints, video copies, and text rasterizations. During normal preview, video copies should remain unchanged; they increase when recording the canvas. Native frame counters apply to the loaded media in each player.

API references: [video-frame callbacks](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), [media time and seeking](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime).
