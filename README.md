# Aurora-7: Hall of Illusion — Freedom™ After Dark

**[Play the game](https://captaincurso.github.io/aurora-hall-of-illusion/)** · [Source repository](https://github.com/CaptainCurso/aurora-hall-of-illusion)

Aurora built you a civilization. It would be rude to escape it.

A first-person browser game with kinetic civic play, a velvet concierge, an impossible museum, and an interruption inside its host’s neural architecture. Choices alter the citizens and the rooms. Includes three adult fictional avatars, authored conversations, locally produced music/voices, original 3D geometry, generated artwork and three short films. No live model, account, install or external content service is needed to play.

## Play

Use desktop Chrome with WebGL2/hardware acceleration. Choose **Enter with sound** or **Enter quietly**. WASD/up-down arrows move; left-right arrows turn; drag to look; **E** interacts; **Space** pulses or jumps. Escape pauses/closes dialogue. Pause includes volume, Reduced Motion, Spatial Assist and return to room entrance. Exhibitions relocates you without granting progress.

Known route: file three physical votes in the Dividend Sea → connect the three Cortex neurons with Space and choose a returning self → meet Vesper and give him his outward key → reverse museum gravity, climb to Ilex’s unclassified name → approach the cathedral’s ordinary door and physically walk out. No romance or moral score is required. There are unsigned, reciprocal and compromised Minister endings, plus replay.

Each browser saves its own run and preferences in localStorage. No multiplayer, telemetry, backend account or live AI service. Conversations are explicitly authored branches.

## Run locally

Requires Python **3.11**. Double-click `launch.command` on macOS, or run `python3.11 serve.py --local-only` from this directory and open the printed localhost URL. To serve your private Ethernet/Wi-Fi network, run `./launch.command`; the launcher prints the current LAN address. Keep the terminal open; Ctrl-C stops this game server. `--port 8178` selects another port. Do not open index.html directly.

No npm/pip installation or model downloads. Three.js 0.187.0 is vendored unchanged with its MIT license. The LAN server serves only the selected immutable runtime; working files, receipts and directory listings are excluded.

## Source, release and deployment

`vnext/` contains the maintained game source and runtime assets. `builds/v0.9.1/` is the exact tested immutable release: 50 files, manifest SHA-256 `e314e82f07eb231d9bc75005b1e749e4129fe60787c0f46645fe0263cd12ca55`. `python3.11 verify_release.py` checks every frozen hash and source copy. To make a new release, increment VERSION in vnext/src/app.js, update CURRENT_RELEASE.json after review, freeze with `freeze_vnext.py`, and explicitly add its approved files to .gitignore’s publication allowlist. Existing frozen builds are never overwritten.

`python3.11 publish_pages.py` prepares only the release’s allowlisted files and public notices under .publish/site. `python3.11 publish_pages.py --push` commits that tree to gh-pages and pushes it to the existing origin. GitHub Pages publishes gh-pages at its root, with .nojekyll. Source remains on main. No private production folders are published. See [publication notes](PUBLICATION.md) and [GitHub’s publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Verification and limits

Chrome 156.0.8078.80 on Familiar: actual-input full routes with and without Spatial Assist; final sound-on unassisted route to the physical reciprocal ending; missing/stalled/rejected voice recovery; captions, native music/video playback, Pause, and all release-file hashes. Independent QA passed the tested paths; Aurora accepted the creative experience; Designer accepted the visuals, carrying forward unchanged content across the narrow voice-failure fix. This repository includes a concise [verification record](VERIFICATION.md). Original detailed private evidence remains preserved locally.

Audio decoding, signal and captions were verified; reviewers could not perceptually hear through their tools, so artistic listening and speaker output are not claimed approved. Films are three 512×288, 4.041667-second loops with visible softness, streaks and geometry/color drift. Portraits are planar holograms inside real navigable 3D geometry. Desktop Chrome is tested; touch, other browsers and full assistive-technology access are not established. Reduced Motion stops decorative films/motion while necessary gameplay still moves. Dense signage and a minor corridor staging label remain.

## Credits and assets

A standalone Music and Madness interpretation, not a change to campaign canon. Developer: implementation/integration; Designer: worlds, portraits, art/films and visual review; Aurora: creative direction, music and voices; QA: independent functional review. See [asset provenance](ASSET_PROVENANCE.md). Local production used FLUX.2 Klein, Wan2.2, MiniMax-Music3, Qwen3-TTS, Blender and PhotoCraft. Model weights and application state are not included. Third-party license notices are retained; no blanket redistribution license is granted for campaign imagery with undocumented original rights.
