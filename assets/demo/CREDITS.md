# Demo footage

Stock clips used in the landing-page studio demo (`landing.html`, `#demo`).
Downloaded 2026-11-19 from Mixkit under the Mixkit Stock Video Free License
(https://mixkit.co/license/#videoFree). Re-encoded to 540×960 H.264, 24 fps, no audio.

| File | Source clip | Trim |
|---|---|---|
| vlog.mp4 | "Portrait of an influencer talking to the camera" — https://mixkit.co/free-stock-video/portrait-of-an-influencer-talking-to-the-camera-42323/ | 0.5s → 9.5s (replaced 34487 on 2026-11-19) |
| friends.mp4 | "Pair of happy girls dancing in front of the camera" — https://mixkit.co/free-stock-video/pair-of-happy-girls-dancing-in-front-of-the-camera-42311/ | 3.5s → 9.5s |

Posters (`*-poster.jpg`) and timeline strips (`*-strip.jpg`) are frames extracted from these files.
Before launch, re-check the licence page for current terms.

Note: the vlog.mp4 backdrop shows retail cereal boxes with legible brand names; review before using in paid marketing.

## How it works cards

Short muted loops (3.5–5 s), downloaded 2026-11-19 from Mixkit under the same free licence.
Import tiles are cropped to 16:10 (400×250); the Export phone is 360×640.

| File | Source clip | Trim / crop |
|---|---|---|
| import-1.mp4 | https://mixkit.co/free-stock-video/cheerful-girl-recording-herself-with-a-colorful-background-42308/ | 6.0s +3.5s, crop y=110 |
| import-2.mp4 | https://mixkit.co/free-stock-video/behind-the-scenes-of-a-speaker-talking-on-camera-34486/ | 3.0s +3.5s, crop y=400 |
| import-3.mp4 | https://mixkit.co/free-stock-video/influencers-dancing-in-a-recording-a-tik-tok-video-42315/ | 5.0s +3.5s, crop y=160 |
| import-4.mp4 | https://mixkit.co/free-stock-video/two-girls-take-a-selfie-having-fun-and-dancing-in-42313/ | 4.0s +3.5s, crop y=230 |
| export.mp4 | https://mixkit.co/free-stock-video/happy-woman-dancing-happily-in-a-colorful-spot-42306/ | 1.0s +5s |

The matching .jpg files are each clip's first frame, used as the poster.

## Hero footage wall

wall-1.jpg … wall-12.jpg are 270×480 stills taken from the clips above (42323, 42311, 42308, 34486, 42315, 42313, 42306). The live wall tiles reuse import-*.mp4, export.mp4, friends.mp4 and vlog.mp4.

## Looks carousel

looks.mp4 (540×960, 6 s) and looks.jpg come from Mixkit 42308, "Cheerful girl recording herself with a colorful background" (https://mixkit.co/free-stock-video/cheerful-girl-recording-herself-with-a-colorful-background-42308/), trimmed from 2.5 s to 8.5 s.

## Template previews

`assets/templates/<id>.mp4` and `<id>.jpg` are 360×640 loops rendered by `node scripts/build-template-previews.mjs`: Replotre's own template renderer composited over the Mixkit clips above (vlog, looks, export, friends). Copy shown in them is demo text. Re-run the script after changing a template's look.

The first five gallery cards now use the reference videos requested from [SkilledCut](https://skilledcut.com/), downloaded with their matching posters on 2026-11-22. These are the original 360×640 muted card videos, stored locally without re-encoding or changing their embedded branding. They are separate from Replotre's generated previews, so rebuilding those previews preserves the downloaded assets.

| Gallery card | Local video and poster | Video source |
|---|---|---|
| Crimson Studio | `assets/templates/wine.mp4`, `wine.jpg` | https://skilledcut.com/media/templates/wine/card.mp4 |
| Candlelit | `assets/templates/plum.mp4`, `plum.jpg` | https://skilledcut.com/media/templates/plum/card.mp4 |
| Motion Deck | `assets/templates/layers.mp4`, `layers.jpg` | https://skilledcut.com/media/templates/layers/card.mp4 |
| Beat Keyword | `assets/templates/cobalt.mp4`, `cobalt.jpg` | https://skilledcut.com/media/templates/cobalt/card.mp4 |
| Hero Float | `assets/templates/float-ad.mp4`, `float-ad.jpg` | https://skilledcut.com/media/templates/float-ad/card.mp4 |

Each poster comes from the same source URL with `.jpg` in place of `.mp4`. These are reference examples; applying a Replotre template still uses Replotre's own editable renderer. The Mixkit licence above covers the stock clips listed in that section and does not describe the downloaded SkilledCut references.

## Pinterest reference previews

These two videos were requested by the user and downloaded from the public media URLs included in their Pinterest pages on 2026-11-22. The complete videos are stored as 360×640 H.264 previews at 24 fps, without audio, with fast-start metadata. The matching Pinterest poster images are scaled to the same size. Embedded text and branding are retained. These assets use separate filenames from the generated previews and are not covered by the Mixkit licence above. Applying these looks uses Replotre's own editable template elements.

| Gallery card | Local files | Pinterest source | Credited creator |
|---|---|---|---|
| Interview Glow | `assets/templates/interview-glow.mp4`, `interview-glow.jpg` | https://www.pinterest.com/pin/1118863101209858069/ | Sumit Sharma (`thesharmasumit`) |
| Property Reel | `assets/templates/property-reel.mp4`, `property-reel.jpg` | https://www.pinterest.com/pin/1100004277771101481/ (shared as https://pin.it/295Vf0oqa) | Anas Shaikh (`anasshaikhonwork`) |

Original media URLs:

- Interview Glow: https://v1.pinimg.com/videos/iht/expMp4/dc/f0/2e/dcf02ee741ba5cc918440febaecd2879_720w.mp4
- Property Reel: https://v1.pinimg.com/videos/iht/expMp4/f2/76/08/f276087b6609a176eee91110b677ffe0_720w.mp4
