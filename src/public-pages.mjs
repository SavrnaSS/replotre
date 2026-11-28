/** Public, server-rendered content. This registry also drives metadata and the sitemap. */
export const publicPages = [
  {
    path: '/', file: 'landing.html', label: 'Home',
    title: 'AI Video Editor Online: Edit by Describing It | Replotre',
    description: 'Replotre is an AI video editor in your browser. Describe the edit, then fine-tune trims, captions, titles and color on a real timeline. Export MP4.',
    updated: '2026-11-24',
  },
  {
    path: "/ai-video-editor",
    label: "AI video editor",
    kind: "feature",
    updated: "2026-11-24",
    title: "AI Video Editor: Edit Videos by Describing Them | Replotre",
    description: "Replotre is an AI video editor in your browser. Describe trims, titles, captions, speed and framing in plain words, then fine-tune every change on a real timeline.",
    heading: "The AI video editor that edits the way you describe it.",
    intro: "Tell Replotre what you want, like “make it vertical, add a title and slow the last clip”, and the AI Director makes the change on a real timeline. Review it, undo it or adjust it by hand. No installs: it runs in your browser.",
    sections: [{"id": "what", "title": "What is an AI video editor?", "paragraphs": ["An AI video editor lets you change a video by describing the result instead of performing every step yourself. Rather than hunting through menus to crop, retime and caption a clip, you write the instruction and the editor carries it out.", "Many AI video tools generate a finished video from a template and give you little control afterwards. Replotre takes a different approach: every AI change becomes an ordinary edit on a multi-track timeline. You keep the speed of describing an edit and the precision of a real editor, so you can fix a single frame, nudge a caption or undo one step without starting over."]}, {"id": "ask", "title": "What you can ask the AI Director", "paragraphs": ["Write instructions the way you would brief an editor. Clear prompts name the action and the result. These are the kinds of edits the Director handles today:"], "list": ["Change the frame: “Make it vertical for Reels” or “Switch to 16:9 for YouTube.”", "Add and style text: “Add a title saying Launch day at the top in white.”", "Trim and split: “Trim the first clip to 4 seconds” or “Split the clip at the playhead.”", "Change speed: “Slow the last clip to half speed for a slow-motion ending.”", "Fix sound: “Lower the music to 30%” or “Remove the background music.”", "Caption speech: “Add captions from what I say” to turn speech into timed captions.", "Restyle the look: ask for a mood such as a warm, cinematic look and refine it."]}, {"id": "control", "title": "AI speed with real timeline control", "paragraphs": ["Each instruction produces a list of changes you can see on the timeline. Play the affected section, then keep it, undo it or refine it with the timeline tools: trims, splits, speed, volume, keyframes and text. Selecting a clip before you write a prompt focuses the edit on that shot.", "Because the AI works on the same timeline you do, you never have to choose between automatic and manual editing. Use the Director for the repetitive steps and your own judgement for the moments that matter."]}, {"id": "footage", "title": "Built around your footage, speech and sound", "paragraphs": ["Replotre edits the videos you bring. Cloud uploads can be analyzed for scene changes, quiet stretches and audio onsets, which power actions like splitting at scenes and removing silence. Speech transcription turns what people say into captions you can edit and export as SRT or WebVTT.", "Analysis gives you starting points rather than final decisions. A quiet pause can be intentional, so listen to each transition and keep the moments that serve your story."]}, {"id": "social", "title": "Made for Reels, TikTok and YouTube Shorts", "paragraphs": ["Short-form video rewards fast, consistent editing. Start in a vertical 9:16 frame, add speech captions, put a title in the first seconds and trim the pauses. When the same story needs a landscape cut for YouTube or a square post, ask the Director to change the frame and adjust the framing on the timeline.", "See the full workflow in the guide to the AI video editor for Reels, TikTok and Shorts."]}, {"id": "workflow", "title": "How to edit a video with AI in Replotre", "steps": ["Open Replotre Studio, sign in and choose a plan.", "Import your footage and pick a frame: vertical, landscape, square or portrait.", "Select a clip if your instruction is about one shot, then describe the edit to the AI Director.", "Review the changes on the timeline and refine trims, text and timing by hand.", "Preview the whole sequence and export an MP4 or WebM."]}, {"id": "compare", "title": "How Replotre compares", "paragraphs": ["Desktop editors give full control but take time to install and learn. Template apps are quick but lock you into presets. Replotre sits between them: you describe edits in plain language like a template app, and you keep a real timeline like a desktop editor, all in a browser tab.", "Replotre edits existing footage. It does not generate a whole film from a text prompt, and flexible AI planning, transcription and AI-designed looks rely on connected AI services."]}, {"id": "pricing", "title": "Pricing", "paragraphs": ["Studio access needs an account and a Creator or Pro subscription. Creator is $12 a month or $115 a year, and Pro is $29 a month or $278 a year (USD). Both include the AI Director, captions, templates and MP4 export; Pro raises the AI, storage and upload limits. Cancel any time."]}],
    faq: [["What is the best way to edit videos with AI?", "Describe one clear change at a time, check it on the timeline, then refine it. In Replotre every AI edit becomes a normal timeline change, so you can keep, undo or adjust it."], ["Can the AI edit my video automatically?", "Yes. The AI Director can change the frame, add and style titles, trim and split clips, change speed and volume, remove background music and add captions from speech. You review each change before you export."], ["Do I need to download software?", "No. Replotre runs in a current Chromium browser such as Chrome, Edge, Brave or Arc."], ["Does Replotre add captions automatically?", "Yes. It transcribes speech into timed captions that you can edit and style, and you can export them as SRT or WebVTT subtitle files."], ["Is Replotre free?", "No. You can explore the interactive demo on the home page for free, but the Studio needs a Creator ($12/month) or Pro ($29/month) plan."], ["Can I edit vertical videos for TikTok, Reels and Shorts?", "Yes. Start in a 9:16 frame, or ask the Director to switch any project to vertical, square, portrait or landscape."]],
    related: ["/ai-video-editor-for-social-media", "/guides/how-to-edit-videos-with-ai", "/auto-captions"],
  },
  {
    path: "/ai-video-editor-for-social-media",
    label: "AI video editor for Reels, TikTok and Shorts",
    kind: "feature",
    updated: "2026-11-24",
    title: "AI Video Editor for Reels, TikTok & YouTube Shorts | Replotre",
    description: "Edit vertical videos for Instagram Reels, TikTok and YouTube Shorts with AI. Captions from speech, titles, trims and 9:16 framing in your browser.",
    heading: "Edit Reels, TikToks and Shorts by describing them.",
    intro: "Short videos live or die in the first seconds. Replotre's AI video editor handles the repetitive steps, vertical framing, captions, titles and tight trims, so you can spend your time on the hook and the story.",
    sections: [{"id": "vertical", "title": "Start vertical, stay flexible", "paragraphs": ["Choose a 9:16 frame for Reels, TikTok and Shorts when you create a project. If you also need a landscape version for YouTube or a square post, ask the AI Director to change the frame, then adjust the framing of each shot on the timeline."]}, {"id": "captions", "title": "Captions viewers can read with the sound off", "paragraphs": ["Many people watch short videos muted. Turn speech into timed captions, check the words, and choose a caption style that stays readable on a phone. Keep lines short and away from the bottom edge, where app buttons and descriptions cover the video."]}, {"id": "hook", "title": "A stronger hook in the first seconds", "paragraphs": ["Open on the most interesting moment, then add a short title that tells viewers why to keep watching. Prompts such as “Trim the first clip to start at the reaction” or “Add a title saying Wait for it at the top” keep the opening tight."]}, {"id": "prompts", "title": "Prompts that work well for short-form video", "list": ["“Make it vertical and add captions from what I say.”", "“Add a title saying 3 editing tips at the top for the first 3 seconds.”", "“Trim the first clip to 2 seconds.”", "“Slow the last clip to half speed.”", "“Lower the music so the voice is clear.”"]}, {"id": "workflow", "title": "A fast short-form workflow", "steps": ["Create a vertical 9:16 project in Replotre Studio and import your clips.", "Ask the AI Director to add captions from speech, then fix any misheard words.", "Tighten the opening and remove dead air between sentences.", "Add a title for the hook and check it stays inside the safe area.", "Preview on the timeline and export an MP4 for upload."]}, {"id": "limits", "title": "Good to know", "paragraphs": ["Replotre edits your own footage; it does not post to social apps for you. Export the finished MP4 and upload it in the app. Studio access needs a Creator or Pro plan."]}],
    faq: [["What size should a Reel, TikTok or Short be?", "Use a vertical 9:16 frame, 1080×1920 pixels. Replotre's vertical frame uses that size."], ["Can I add captions to TikTok videos automatically?", "Yes. Replotre turns speech into timed captions you can edit and style before you export the video."], ["Can I make a landscape version of the same video?", "Yes. Ask the Director to switch the frame to 16:9, then adjust the framing of each clip."]],
    related: ["/ai-video-editor", "/auto-captions", "/guides/add-captions-to-video"],
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
    path: "/guides/how-to-edit-videos-with-ai",
    label: "How to edit videos with AI",
    kind: "article",
    updated: "2026-11-24",
    title: "How to Edit Videos with AI: A Step-by-Step Guide | Replotre",
    description: "Learn how to edit a video with AI: write clear prompts, review each change on the timeline, add captions and export. A practical guide using Replotre.",
    heading: "How to edit videos with AI, step by step.",
    intro: "AI makes editing faster when you treat it like a capable assistant: give it a clear brief, check its work and keep the final decisions. This guide shows a reliable way to edit a video with AI in Replotre.",
    sections: [{"id": "plan", "title": "1. Know what the video is for", "paragraphs": ["Write one sentence about the purpose of the video and where it will be posted. A 30-second Reel, a YouTube tutorial and a product demo need different frames, lengths and openings. That sentence becomes the context for every prompt you write."]}, {"id": "import", "title": "2. Import footage and pick a frame", "paragraphs": ["Create a project, import your clips and choose a frame: vertical 9:16 for Reels, TikTok and Shorts, 16:9 for YouTube, 1:1 or 4:5 for feed posts. Put the clips in a rough order on the timeline before asking for detailed edits."]}, {"id": "prompt", "title": "3. Write prompts that name the action and the result", "paragraphs": ["Good prompts are specific. “Make it better” gives the AI nothing to act on; “Trim the first clip to 3 seconds and add a title saying Day one at the top” does. Select a clip first when the instruction is about one shot."], "list": ["Name the action: trim, split, slow down, add a title, add captions.", "Name the target: the first clip, the selected clip, the music.", "Name the result: 3 seconds, half speed, at the top, in white."]}, {"id": "review", "title": "4. Review every change on the timeline", "paragraphs": ["After each prompt, play the part of the video that changed. Keep what works, undo what doesn't and fine-tune the rest by hand. Small, frequent checks are faster than fixing a long chain of edits at the end."]}, {"id": "captions", "title": "5. Add captions and check the words", "paragraphs": ["Ask for captions from speech, then read them through. Fix names, numbers and any misheard words, and keep each line short enough to read on a phone. Export SRT or WebVTT files if you also need separate subtitles."]}, {"id": "export", "title": "6. Preview the whole video and export", "paragraphs": ["Watch the full sequence once from start to finish, listening for abrupt cuts and checking that text stays inside the frame. Then export an MP4 for publishing."]}],
    faq: [["Will AI replace manual editing?", "Not entirely. AI speeds up repetitive steps like trimming, captions and reframing, but taste and timing still come from you. That's why Replotre keeps every AI change editable on the timeline."], ["What should I write in an AI editing prompt?", "Name the action, the target and the result, for example “Slow the last clip to half speed.”"]],
    related: ["/ai-video-editor", "/guides/how-to-edit-videos-online", "/ai-video-editor-for-social-media"],
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
<link rel="icon" href="/favicon.ico?v=4" sizes="16x16 32x32 48x48" />
<link rel="icon" type="image/png" sizes="96x96" href="/assets/brand/replotre-icon-96.png?v=4" />
<link rel="icon" type="image/png" sizes="192x192" href="/assets/brand/replotre-icon-192.png?v=4" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=4" />
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png?v=4" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0C0D0F" />
<link rel="preload" href="/assets/fonts/inter-opsz.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="/typography.css?v=1.1.1" />
<link rel="stylesheet" href="/learn.css?v=1.1.0" />
<script src="/landing-theme.js?v=2.21.0"></script>
</head>
<body>
<a class="learn-skip" href="#main">Skip to content</a>
<header class="learn-nav"><div class="learn-wrap learn-nav-in">
<a class="learn-logo" href="/" aria-label="Replotre home"><img class="rp-mark" src="/assets/brand/replotre-mark.svg" alt="" width="24" height="24" decoding="async" draggable="false" /><em class="wm-r">R</em>eplotre<span>.</span></a>
<nav aria-label="Main navigation"><a href="/ai-video-editor">AI editor</a><a href="/auto-captions">Captions</a><a href="/guides">Guides</a><a class="learn-button" href="/studio">Open Studio</a></nav>
</div></header>
${content}
<footer class="learn-footer learn-wrap"><div><a class="learn-logo" href="/"><img class="rp-mark" src="/assets/brand/replotre-mark.svg" alt="" width="24" height="24" decoding="async" draggable="false" /><em class="wm-r">R</em>eplotre<span>.</span></a><p>Thoughtful edits. A real timeline. Right in your browser.</p></div><nav aria-label="Footer"><a href="/ai-video-editor">AI video editor</a><a href="/ai-video-editor-for-social-media">AI editor for Reels &amp; Shorts</a><a href="/guides/how-to-edit-videos-with-ai">Edit videos with AI</a><a href="/auto-captions">Automatic captions</a><a href="/video-templates">Video templates</a><a href="/remove-silence-from-video">Remove silence</a><a href="/guides">Editing guides</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
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
<div class="learn-layout"><aside class="learn-toc"><nav aria-label="On this page"><p class="learn-kicker">On this page</p><ol>${sections.map(section => `<li><a href="#${section.id}">${escapeHtml(section.title.replace(/^\d+\. /, ''))}</a></li>`).join('')}${page.faq?.length ? '<li><a href="#faq">FAQ</a></li>' : ''}</ol></nav></aside>
<div class="learn-content">${sections.map(section => `<section id="${section.id}" class="learn-section"><h2>${escapeHtml(section.title)}</h2>${(section.paragraphs || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')}${section.steps ? `<ol class="learn-steps">${section.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : ''}${section.list ? `<ul class="learn-list">${section.list.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}</section>`).join('')}
${page.faq?.length ? `<section id="faq" class="learn-section learn-faq"><h2>Frequently asked questions</h2>${page.faq.map(([q, ans]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(ans)}</p></details>`).join('')}</section>` : ''}
<div class="learn-note"><p>Ready to try this with your footage?</p><a class="learn-button" href="/studio">Open Studio</a><a href="/privacy">Read the privacy policy</a></div></div></div>`}
</${isArticle ? 'article' : 'div'}>
<section class="learn-related" aria-labelledby="relatedTitle"><p class="learn-kicker">Keep exploring</p><h2 id="relatedTitle">More ways to shape your edit</h2>${cards(page.related.map(getPublicPage))}</section>
</main>`);
}

export function renderNotFound() {
  return shell('<main id="main" class="learn-wrap"><div class="learn-hero"><p class="learn-kicker">404 · Page not found</p><h1>Let’s find your next cut.</h1><p class="learn-intro">This page is unavailable. Head back to Replotre or explore a guide to get started.</p><div class="learn-actions"><a class="learn-button" href="/">Back to Replotre</a><a href="/guides">Browse editing guides</a></div></div></main>');
}
