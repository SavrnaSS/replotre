/** Public, server-rendered content. This registry also drives metadata and the sitemap. */
export const publicPages = [
  {
    path: '/', file: 'landing.html', label: 'Home',
    title: 'Replotre | Online AI Video Editor, Captions & Templates',
    description: 'Edit videos online with Replotre. Describe edits to the AI Director, trim your timeline, add speech captions, apply templates and export MP4 or WebM.',
  },
  {
    path: '/ai-video-editor', label: 'AI video editor', kind: 'feature',
    title: 'AI Video Editor with Timeline Control | Replotre',
    description: 'Describe video edits in plain language, then refine them on a real timeline. Use Replotre AI Director for trims, titles, framing, speed and color.',
    heading: 'An AI video editor that keeps you in control.',
    intro: 'Start with your own footage. Tell the Director what to change, review the result on the timeline, and adjust the details by hand. Replotre combines natural-language editing with a browser video workspace.',
    sections: [
      { id: 'describe', title: 'Describe the edit, then check the result', paragraphs: [
        'A useful editing prompt names the action and the result you want: “Make it vertical and add a title saying Launch day,” or “Slow the selected clip to half speed.” The Director can change framing, add text, trim or split clips, adjust speed and volume, and apply color changes. Supported actions produce editable timeline changes.',
        'Review the action list and play the affected section before continuing. If a change does not fit your story, undo it or refine it on the timeline. Keep prompts focused when you need precise control over one clip.',
      ] },
      { id: 'footage', title: 'Work with your footage, speech and soundtrack', paragraphs: [
        'Cloud uploads can be analyzed for scene boundaries, quiet intervals and audio onsets. Those measurements support actions such as splitting at scenes and removing detected silence. Speech transcription and sampled-frame descriptions are separate actions that depend on the AI services available on the server.',
        'Analysis gives you starting points to review. A quiet pause may be intentional, and an audio onset is not always a musical beat. Listen to the transitions and choose the moments that serve your edit.',
      ] },
      { id: 'workflow', title: 'How to edit a video with the Director', steps: [
        'Sign in, choose a plan and create a project in Studio.',
        'Import your footage and choose a frame: vertical, landscape, square or portrait.',
        'Select a clip when your instruction applies to one shot, then describe an edit in Director.',
        'Review the timeline, refine trims and text, and preview the sequence.',
        'Export a browser WebM or a server-rendered MP4 within your plan limits.',
      ] },
      { id: 'expectations', title: 'What to know before you start', paragraphs: [
        'Replotre edits existing media; it does not generate an entire film from a text prompt. Some explicit editing tools work without an external AI provider, while flexible AI planning, transcription and AI-designed looks require configured services. Studio access requires an account and an active subscription.',
        'Cloud projects upload media to the server. Requested AI actions may send the audio, sampled frames or project context needed for that task to the relevant provider. Read the privacy policy before uploading sensitive footage.',
      ] },
    ],
    related: ['/auto-captions', '/remove-silence-from-video', '/guides/how-to-edit-videos-online'],
  },
  {
    path: '/auto-captions', label: 'Automatic video captions', kind: 'feature',
    title: 'Automatic Video Captions & SRT Subtitles | Replotre',
    description: 'Turn speech into timed video captions, review the words and export SRT or WebVTT subtitles. Create captioned videos in the Replotre online editor.',
    heading: 'Turn spoken words into editable video captions.',
    intro: 'Use your source audio to create a timed transcript, find a spoken passage and build captions for your edit. Review the words before sharing, then choose a video export or a separate subtitle file.',
    sections: [
      { id: 'speech', title: 'Captions grounded in your source audio', paragraphs: [
        'Replotre requests a speech transcript with word and segment timestamps when you run transcription on an uploaded clip. The transcript comes from the speech provider; the editor does not invent a transcript when transcription is unavailable or fails. Clear speech and a useful microphone recording give you a better starting point.',
        'Search the transcript to find a passage and seek to its source moment. Check names, numbers, technical terms and phrases spoken over music. Automatic captions are a draft to review, especially when accuracy matters.',
      ] },
      { id: 'timing', title: 'Keep captions aligned with the edited timeline', paragraphs: [
        'Caption timing takes source trims, clip order and playback speed into account. This matters when a source recording becomes several shorter shots: a word belongs at its edited position, rather than at the original recording time.',
        'Preview captions after trimming or changing speed. Keep text readable against the footage and leave room for the controls and overlays used by your destination platform. A short, well-timed caption is easier to follow than a full paragraph.',
      ] },
      { id: 'workflow', title: 'How to add automatic captions', steps: [
        'Open a subscribed Studio project and upload a video with speech.',
        'Open Insights, select the source clip and request transcription when the speech service is available.',
        'Review the transcript and use the caption tools to create timed text.',
        'Adjust caption styling and preview the full edited sequence with sound.',
        'Export your video, or download captions as SRT or WebVTT for another player or platform.',
      ] },
      { id: 'formats', title: 'Choose between video captions and subtitle files', paragraphs: [
        'Text rendered into a video stays visible wherever that video plays. A separate SRT or WebVTT file carries the caption text and timing so a compatible player can offer subtitles. The destination platform controls how an uploaded subtitle file is displayed.',
        'Transcription requires a configured speech provider and uses your account’s AI allowance. Audio needed for transcription is sent to that provider when you request the action. Caption styling can differ between browser and MP4 rendering, so check the exported result as well as the preview.',
      ] },
    ],
    related: ['/guides/add-captions-to-video', '/ai-video-editor', '/video-templates'],
  },
  {
    path: '/video-templates', label: 'Video editing templates', kind: 'feature',
    title: 'Editable Video Templates & Motion Styles | Replotre',
    description: 'Apply editable video templates, color looks and motion titles to your footage. Explore caption styles, cinematic frames and AI-assisted styling in Replotre.',
    heading: 'Give your footage a look you can make your own.',
    intro: 'Start with a video template, then edit the color, text and motion to fit your footage. Replotre’s template gallery brings visual starting points into the same timeline as the rest of your edit.',
    sections: [
      { id: 'looks', title: 'Start with the story and choose a style', paragraphs: [
        'The gallery includes looks such as Crimson Studio, Candlelit, Motion Deck, Beat Keyword and Hero Float. Some are built around expressive titles; others emphasize caption treatments, a documentary feel or cinematic framing. Choose a style that supports your message before adjusting its details.',
        'Templates can add a color grade, a backdrop treatment and timed motion elements. Depending on the look, these can include kinetic headlines, keyword changes, caption highlights, lower thirds, progress elements or film treatments. The available elements appear in the template panel for editing.',
      ] },
      { id: 'customize', title: 'Refine the result on your timeline', paragraphs: [
        'Replace sample wording with your message, check text placement around faces and adjust color for the source shot. A template is a starting point, so preview the opening, every cut and the ending after applying it. Applying or removing a template is an undoable action.',
        'Templates marked Depth can place type behind a person using an on-device segmentation model. Segmentation quality depends on the footage; inspect hair, hands and movement against the background before publishing.',
      ] },
      { id: 'workflow', title: 'How to apply a video template', steps: [
        'Sign in to Studio, choose a plan and add footage to your project.',
        'Open Templates or the full gallery and preview a suitable look.',
        'Apply it, then edit the text, color and placement in the panel.',
        'If AI styling is available, ask it to fit the look to your footage or describe a new look.',
        'Preview and export a short test before rendering the full edit.',
      ] },
      { id: 'export', title: 'Choose an export that supports your design', paragraphs: [
        'Browser WebM export includes template motion layers. Server MP4 rendering includes the grade and supported text layers, but does not reproduce every template motion effect. Use WebM when your finished piece relies on those motion layers, and check platform format support before delivery.',
        'Built-in templates can lay out without an external styling key. AI fitting and designing a look require the configured styling provider and use your account’s AI allowance. Requested AI styling may use transcript context, timing and sampled frames to fit the design.',
      ] },
    ],
    related: ['/auto-captions', '/ai-video-editor', '/guides/how-to-edit-videos-online'],
  },
  {
    path: '/remove-silence-from-video', label: 'Remove silence from video', kind: 'feature',
    title: 'Remove Silence from Video with Editable Cuts | Replotre',
    description: 'Find quiet intervals in uploaded footage and remove detected silence in Replotre. Review the cuts, refine the pacing and export your edited video.',
    heading: 'Find quiet pauses. Keep the ones that matter.',
    intro: 'Use footage analysis to locate quiet intervals, then remove detected silence from your edit. Review the resulting cuts on a real timeline so the final pacing still sounds natural.',
    sections: [
      { id: 'analysis', title: 'Use audio analysis to find a starting point', paragraphs: [
        'Uploaded cloud footage is analyzed for audio measurements, including quiet intervals. The remove-silence tool uses those detected intervals to shorten a clip. This can help with a talking video that contains long gaps between takes or an explanation with repeated stops.',
        'Silence detection is based on the audio signal. It does not understand whether a pause creates emphasis, gives a viewer time to read or belongs to a musical transition. Background noise can also keep an otherwise empty interval from being detected as quiet.',
      ] },
      { id: 'workflow', title: 'How to remove detected silence', steps: [
        'Create a subscribed Studio project and upload the source recording.',
        'Wait for source analysis to finish, then open Insights to inspect the footage.',
        'Use the remove-silence editing action on the relevant footage.',
        'Listen across every new cut and undo or refine any cut that sounds abrupt.',
        'Recheck captions and export a short sample before finishing the full video.',
      ] },
      { id: 'pacing', title: 'Make a tighter edit without rushing the speaker', paragraphs: [
        'Listen for clipped consonants and breaths at the join between two sections. A pause before an important sentence may be worth keeping even if the analyzer marks it as quiet. Review the sequence with the soundtrack at its intended level, rather than judging the waveform alone.',
        'For interviews, tutorials and spoken social clips, the useful goal is understandable pacing. Keep enough space for a change of idea. Use a manual trim when only one boundary needs attention instead of running another broad edit across the whole sequence.',
      ] },
      { id: 'related-tools', title: 'Combine silence removal with captions and scene cuts', paragraphs: [
        'Replotre also exposes detected scene boundaries and audio onsets for other editing actions. These are different signals: a scene change marks visual structure, a quiet interval marks low audio activity, and an onset marks a rise in sound. Pick the tool that matches the problem in your footage.',
        'Silence analysis uses the local server media tools and does not require a speech transcription key. Cloud footage is uploaded for processing; transcription is a separate requested action. After changing the timeline, preview any captions and export the supported MP4 or browser WebM format you need.',
      ] },
    ],
    related: ['/auto-captions', '/ai-video-editor', '/guides/how-to-edit-videos-online'],
  },
  {
    path: '/guides', label: 'Video editing guides', kind: 'collection',
    title: 'Online Video Editing Guides | Replotre',
    description: 'Learn how to edit videos online and add timed captions in Replotre. Follow practical steps for importing footage, refining your timeline and exporting.',
    heading: 'A clearer path from footage to finished video.',
    intro: 'Practical guides for your first edit and your next one. Follow the workflow in Studio, review what changed and choose the export that fits your project.',
    related: ['/ai-video-editor', '/auto-captions', '/video-templates', '/remove-silence-from-video'],
  },
  {
    path: '/guides/how-to-edit-videos-online', label: 'How to edit videos online', kind: 'article',
    title: 'How to Edit Videos Online: A Practical Guide | Replotre',
    description: 'Learn how to edit a video online in Replotre: import footage, choose a frame, trim clips, add captions and titles, review your edit and export.',
    heading: 'How to edit a video online, from first clip to export.',
    intro: 'A good first edit starts with a clear purpose and a small set of shots. This guide walks through a browser editing workflow in Replotre, with a review step before each decision becomes part of the finished video.',
    sections: [
      { id: 'prepare', title: '1. Decide what the video needs to do', paragraphs: [
        'Write one sentence describing the point of the video. A product announcement needs a different opening from a tutorial or a personal recap. Choose the material that supports that point and put copies of the original footage somewhere safe before editing.',
        'Decide where the video will be shown. Replotre supports vertical 9:16, landscape 16:9, square 1:1 and portrait 4:5 framing. Choose a frame early so you can judge where faces, titles and captions will sit. You can change the frame later, but you will need to check the composition again.',
      ] },
      { id: 'import', title: '2. Open Studio and import your footage', paragraphs: [
        'Sign in, choose an active plan and create a project. Import the video clips, images and audio you intend to use. Cloud uploads go to the server for storage and processing; review the privacy policy if your recording contains confidential material.',
        'Wait for the media you need to become available before judging playback. Source analysis can expose scene boundaries, waveforms and quiet intervals in Insights. Those signals help you navigate a recording, but you still decide which shots belong in the edit.',
      ] },
      { id: 'rough-cut', title: '3. Build a rough cut on the timeline', paragraphs: [
        'Arrange the shots in the order a viewer needs to see them. Trim the beginning and end of each clip to remove setup time and repeated actions. Use a split when one source contains two separate moments you want to keep.',
        'You can describe supported changes to Director instead of reaching for every control. Try a focused instruction such as “Make it square” or select a clip and ask for a speed adjustment. Check the reported actions and play the affected section. Undo gives you a way to compare the result with your previous cut.',
      ] },
      { id: 'sound', title: '4. Listen before adding visual polish', paragraphs: [
        'Play the rough cut with sound. Listen for missing words, abrupt changes in volume and a soundtrack that competes with speech. A video that looks smooth can still feel unfinished when its audio changes sharply at each cut.',
        'If a spoken recording has long empty gaps, inspect the detected quiet intervals and try remove silence. Review each resulting join. Keep pauses that help the meaning and use manual trims for individual problem boundaries.',
      ] },
      { id: 'text', title: '5. Add titles, captions and a consistent look', paragraphs: [
        'Use a short title to establish context. For speech, request transcription when it is available and create captions from the timed transcript. Check names, numbers and timing rather than assuming the first transcription is ready to publish.',
        'Apply a color look or template after the structure is working. Replace template wording and check text against faces and busy backgrounds. Consistency matters more than using every effect: a restrained title, readable captions and a clear subject often need less adjustment.',
      ] },
      { id: 'export', title: '6. Review and choose the right export', paragraphs: [
        'Watch the whole timeline without stopping. Check the opening frame, text near the edges, sound at transitions and the final frame. Use an in/out range to test a complex section before rendering the complete video.',
        'Browser WebM export includes template motion layers. Server MP4 export supports H.264 video and AAC audio, up to the resolution and duration allowed by your plan, with supported grades and text layers. MP4 does not include every browser template effect. Download a sample and verify playback, captions and sound in the destination you plan to use.',
        'If you need a separate subtitle file, download SRT or WebVTT from the project. Keep the project and original sources so you can revise the edit for another frame or update the wording later.',
      ] },
    ],
    related: ['/ai-video-editor', '/remove-silence-from-video', '/guides/add-captions-to-video'],
  },
  {
    path: '/guides/add-captions-to-video', label: 'How to add video captions', kind: 'article',
    title: 'How to Add Captions & Export SRT Subtitles | Replotre',
    description: 'Add captions to a video in Replotre: transcribe speech, check words and timing, style readable captions and export video or SRT and WebVTT subtitle files.',
    heading: 'How to add captions that are easy to follow.',
    intro: 'Captions help viewers follow speech when sound is unavailable or difficult to hear. Start with a timed transcript, review the words and placement, then check the actual export before sharing your video.',
    sections: [
      { id: 'source', title: '1. Start with the clearest source audio', paragraphs: [
        'Upload a spoken video to a subscribed Replotre Studio project. Listen to the source before requesting transcription. If speech is buried under background music or several people speak at once, expect more manual review of the resulting text.',
        'Open Insights and select the uploaded source. Request transcription when the server’s speech service is available. This sends the audio needed for the task to the speech provider and uses your account’s AI allowance. If transcription fails or the service is unavailable, the editor does not substitute invented speech.',
      ] },
      { id: 'review', title: '2. Review the transcript before styling', paragraphs: [
        'Check the transcript against the audio. Focus on names, numbers, place names and specialist vocabulary, where an almost-correct word can change the meaning. Search the transcript to find a passage and seek to its source moment when you need to listen again.',
        'Use the caption tools to create text from the transcript. Replotre uses source timestamps together with trims, clip order and playback speed to place captions on the edited timeline. Review the timing again after any change that affects the sequence.',
      ] },
      { id: 'readability', title: '3. Make the captions readable over your footage', paragraphs: [
        'Choose a style that separates text from the background. A highlight or box can help over a busy shot, while a restrained treatment can work on a simple backdrop. Keep the number of words on screen manageable and leave enough time to read each phrase.',
        'Check the frame at the size people will actually watch. Keep text away from edges and from the controls or descriptions your destination platform places over the picture. Avoid covering a face or an object the speaker is explaining. Preview dark and bright shots rather than checking only one frame.',
      ] },
      { id: 'format', title: '4. Decide how viewers will receive the captions', paragraphs: [
        'Captions rendered into the video are part of the picture. A viewer sees them without turning on subtitles, but cannot hide or restyle them. This can suit a short social video when you need the wording to remain visible.',
        'SRT and WebVTT files store caption text with timing separately from the video. Download the format your publishing platform accepts, then upload it alongside the video where supported. The platform or player controls the final styling of a separate subtitle track.',
      ] },
      { id: 'check', title: '5. Test the exported result', paragraphs: [
        'Export a short range containing speech, a cut and a caption change. Play the downloaded file with sound, then watch again with sound off. Captions should enter at the right moment and remain understandable without the audio.',
        'Browser and server rendering can display fonts differently, and MP4 does not reproduce every template motion layer. If your caption design relies on browser template effects, test WebM and confirm that your destination accepts it. For a separate SRT or WebVTT file, test it in the intended player with the final video rather than an older cut.',
      ] },
    ],
    related: ['/auto-captions', '/video-templates', '/guides/how-to-edit-videos-online'],
  },
  {
    path: '/privacy', file: 'privacy.html', label: 'Privacy Policy',
    title: 'Privacy Policy | Replotre',
    description: 'How Replotre handles account information, uploaded videos, AI processing, cookies and data deletion. Read the Replotre privacy policy.',
  },
  {
    path: '/terms', file: 'terms.html', label: 'Terms of Service',
    title: 'Terms of Service | Replotre',
    description: 'Read the terms for Replotre accounts, video editing, uploaded content, AI features, subscriptions, billing and cancellation.',
  },
];

export const getPublicPage = pathname => publicPages.find(page => page.path === pathname);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function breadcrumbs(page) {
  return [{path:'/', label:'Home'}, ...(page.kind === 'article' ? [{path:'/guides', label:'Guides'}] : []), {path:page.path, label:page.label}];
}

function cards(pages) {
  return `<div class="learn-cards">${pages.map(page => `<a class="learn-card" href="${page.path}"><span class="learn-kicker">${page.kind === 'article' ? 'Step-by-step guide' : 'Explore the editor'}</span><h3>${escapeHtml(page.label)}</h3><p>${escapeHtml(page.description)}</p><span class="learn-card-link">${page.kind === 'article' ? 'Read the guide' : 'Explore the feature'}</span></a>`).join('')}</div>`;
}

function shell(content) {
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#f7f4ee" />
<meta name="color-scheme" content="light dark" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png" />
<link rel="preload" href="/assets/fonts/inter-opsz.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/typography.css?v=1.0.0" />
<link rel="stylesheet" href="/learn.css?v=1.0.0" />
<script src="/landing-theme.js?v=2.21.0"></script>
</head>
<body>
<a class="learn-skip" href="#main">Skip to content</a>
<header class="learn-nav"><div class="learn-wrap learn-nav-in">
<a class="learn-logo" href="/" aria-label="Replotre home"><img src="/assets/brand/replotre-mark.svg" alt="" width="28" height="25" />replotre<span>.</span></a>
<nav aria-label="Main navigation"><a href="/ai-video-editor">AI editor</a><a href="/auto-captions">Captions</a><a href="/guides">Guides</a><a class="learn-button" href="/studio">Open Studio</a></nav>
</div></header>
${content}
<footer class="learn-footer learn-wrap"><div><a class="learn-logo" href="/">replotre<span>.</span></a><p>Thoughtful edits. A real timeline. Right in your browser.</p></div><nav aria-label="Footer"><a href="/ai-video-editor">AI video editor</a><a href="/auto-captions">Automatic captions</a><a href="/video-templates">Video templates</a><a href="/remove-silence-from-video">Remove silence</a><a href="/guides">Editing guides</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
</body>
</html>`;
}

export function renderPublicPage(page) {
  const crumbs = breadcrumbs(page);
  const sections = page.sections || [];
  const isArticle = page.kind === 'article';
  return shell(`<main id="main" class="learn-wrap">
<nav class="learn-crumbs" aria-label="Breadcrumb"><ol>${crumbs.map((crumb, i) => `<li>${i === crumbs.length - 1 ? `<span aria-current="page">${escapeHtml(crumb.label)}</span>` : `<a href="${crumb.path}">${escapeHtml(crumb.label)}</a>`}</li>`).join('')}</ol></nav>
<${isArticle ? 'article' : 'div'}>
<header class="learn-hero"><p class="learn-kicker">${isArticle ? 'Replotre editing guides' : page.kind === 'collection' ? 'Learn with Replotre' : 'The Replotre toolkit'}</p><h1>${escapeHtml(page.heading)}</h1><p class="learn-intro">${escapeHtml(page.intro)}</p>${isArticle ? '<p class="learn-byline">By the Replotre team</p>' : '<div class="learn-actions"><a class="learn-button" href="/studio">Open Replotre Studio</a><span>Account and active plan required</span></div>'}</header>
${page.kind === 'collection' ? `<section class="learn-section" aria-labelledby="guidesTitle"><h2 id="guidesTitle">Start with a practical guide</h2>${cards(publicPages.filter(p => p.kind === 'article'))}</section>` : `
<div class="learn-layout"><aside class="learn-toc"><nav aria-label="On this page"><p class="learn-kicker">On this page</p><ol>${sections.map(section => `<li><a href="#${section.id}">${escapeHtml(section.title.replace(/^\d+\. /, ''))}</a></li>`).join('')}</ol></nav></aside>
<div class="learn-content">${sections.map(section => `<section id="${section.id}" class="learn-section"><h2>${escapeHtml(section.title)}</h2>${(section.paragraphs || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')}${section.steps ? `<ol class="learn-steps">${section.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : ''}</section>`).join('')}
<div class="learn-note"><p>Ready to try this with your footage?</p><a class="learn-button" href="/studio">Open Studio</a><a href="/privacy">Read the privacy policy</a></div></div></div>`}
</${isArticle ? 'article' : 'div'}>
<section class="learn-related" aria-labelledby="relatedTitle"><p class="learn-kicker">Keep exploring</p><h2 id="relatedTitle">More ways to shape your edit</h2>${cards(page.related.map(getPublicPage))}</section>
</main>`);
}

export function renderNotFound() {
  return shell('<main id="main" class="learn-wrap"><div class="learn-hero"><p class="learn-kicker">404 · Page not found</p><h1>Let’s find your next cut.</h1><p class="learn-intro">This page is unavailable. Head back to Replotre or explore a guide to get started.</p><div class="learn-actions"><a class="learn-button" href="/">Back to Replotre</a><a href="/guides">Browse editing guides</a></div></div></main>');
}
