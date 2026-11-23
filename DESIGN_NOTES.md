# Replotre — Cutroom UI redline (v0.2)

Design guidance adapted from **Unslop** by Damir Sokolovsky, licensed under **CC BY 4.0**: https://github.com/heydamir/unslop. Changes are specific to Replotre and do not reproduce another product's UI.

## Direction

- **Product:** A timeline-first video editor where creators can revise footage manually or through structured commands.
- **Character:** Precise, tactile, editorial.
- **World:** A post-production cutroom: subdued graphite, film contact sheets, warm timecode ink, calibrated controls.
- **Moments:** The portrait film preview and synchronized sample-footage thumbnails; timeline selection provides the only other strong accent.
- **Signature:** The warm cut-line, carried consistently into selection and time readouts.

## Initial audit

- Violet glow, gradient primary buttons and gradient logo tile made the chrome louder than the film itself.
- Many nearby purple tints competed for emphasis, particularly on timeline clips and assistant suggestions.
- Tiny, heavily weighted uppercase labels reduced scanning speed in dense panels.
- Orb artwork and sparkles were generic rather than recognizably part of video production.
- The media browser and editing controls did not share a consistent surface/spacing rhythm.
- The original sample artwork was being redrawn every animation frame even when the background was essentially static.

## Redline applied

1. **Spacing:** 4px-aligned sections; compact 32–36px controls; consistent sidebar and inspector padding.
2. **Color:** Neutral graphite surfaces, one restrained warm amber cut marker, off-white primary export button, quiet hairlines.
3. **Icons:** Existing single-stroke vector set retained; decorative sparkle usage removed from nav, timeline clips and agent header.
4. **Copy:** Action-specific language, sentence-case labels, no hype tagline in the preview footer.
5. **Type:** System sans for long sessions; monospaced timecodes; fewer weights and less tracking.
6. **Layout:** Original full-width editing workspace preserved; panels remain available as mobile overlays.
7. **Details:** Consistent radii, hover/focus states, simpler tags, clearer active timeline selections.
8. **Visuals:** Generated three tonal landscape film studies and previews from the canvas itself, not stock or screenshots.
9. **Motion:** Reduced pointless animation and cached sample-frame backgrounds to improve frame responsiveness.

## Tested

Tested via headless Chromium with the self-contained build:
- Desktop 1440×900: canvas loads, three generated thumbnails, aspect-ratio control, undo, template navigation, properties and export modal.
- Mobile 390×844: no document-level horizontal overflow, bottom navigation opens Tools and AI Director, timeline is horizontally scrollable.
- No JavaScript page errors during those tests.

These checks do not establish performance superiority over Vyra or production readiness. Cloud-AI features, advanced editing algorithms and cross-browser exports remain outside this UI redesign.


## Studio 2 functional upgrade

The original visual-design checks above describe the earlier interface. Studio 2 adds the Insights rail item, responsive source/job/history views, measured waveform thumbnails, live connection/activity indicators, and conflict recovery. The new DOM interaction check covers cloud initialization, actions, source navigation, undo, history, jobs, Director chat, and cross-tab synchronization. Browser screenshot QA for this upgrade could not run because the environment denied launching Chromium; earlier screenshots are not evidence for the new layout.

## Landing demo vector upgrade — 2026-11-18

The landing demo now uses reusable SVG mountain, lake, and forest artwork in its monitor, media library, and timeline thumbnails. Playback and the playhead share a clock; seeking, clip selection, safe-area guides, original/edited comparison, replay, and all three prompt scenarios are interactive. Sequence durations follow the crossfade and half-speed examples. Pausing, leaving the viewport, and reduced-motion preferences stop automatic playback and retain the current edit state. The desktop monitor and Director share a fixed-height row; the mobile layout stacks the monitor, timeline, and Director.

Verification: 31 emulated-DOM, vector-reference, timecode, interaction, and CSS-parse checks passed, along with JavaScript syntax checking. Chromium launch was blocked by the environment, so browser layout and responsive rendering remain unverified.

`output/replotre-studio-upgraded.svg` is a standalone editable vector illustration of the completed demo state, with a matching PNG rendered using resvg. The PNG is an illustration preview, not a browser screenshot. Both files contain the upgraded visual design; the live implementation is in `landing.html`, `landing.css`, and `landing.js`.
