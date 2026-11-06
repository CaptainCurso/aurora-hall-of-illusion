# Aurora-7: Hall of Illusion — Freedom™ After Dark

**[Play the game](https://captaincurso.github.io/aurora-hall-of-illusion/?v=0.10.0)** · [Source repository](https://github.com/CaptainCurso/aurora-hall-of-illusion)

Aurora built you a civilization. It would be rude to escape it.

A first-person browser game with kinetic civic play, a velvet concierge, an impossible museum, and an interruption inside its host’s neural architecture. Choices alter the citizens and the rooms. Includes three adult fictional avatars, authored conversations, locally produced music/voices, original 3D geometry, generated artwork and six short films. The Unscheduled Encore adds three branching visual-novel chapters and a reactive coda, with twelve changing expression portraits, three scene paintings and four new tracks. No live model, account, install or external content service is needed to play.

## Play

Use desktop Chrome with WebGL2/hardware acceleration. Choose **Enter with sound** or **Enter quietly**. WASD/up-down arrows move; left-right arrows turn; drag to look; **E** interacts; **Space** pulses or jumps. Escape pauses/closes dialogue. Pause includes volume, Reduced Motion, Spatial Assist and return to room entrance. Exhibitions relocates you without granting progress.

Known route: file three physical votes in the Dividend Sea → connect the three Cortex neurons with Space and choose a returning self → meet Vesper and give him his outward key → reverse museum gravity, climb to Ilex’s unclassified name → approach the cathedral’s ordinary door and physically walk out. No romance or moral score is required. There are unsigned, reciprocal and compromised Minister endings, plus replay.

Each browser saves its own run and preferences in localStorage. No multiplayer, telemetry, backend account or live AI service. Conversations are explicitly authored branches.

## The Unscheduled Encore

Choose **Begin Encore with sound** or **Read Encore quietly** on the title, or open it through Exhibitions. Aurora’s discarded faces have formed a parliament, Vesper’s teacup contains a home with its own weather, and Ilex’s abandoned names are learning to fly.

Click Continue, Enter or Space to reveal then advance; 1–9 choose; H opens the backlog; Escape pauses. Progress saves automatically. Use Chapters to return to the library and resume or replay. Completing the three chapters unlocks the coda. Replays keep the previous completed result until a new attempt finishes; changing a completed result makes the coda available to play again. Encore saves separately and is optional for the spatial game’s ending.

## Run locally

Requires Python **3.11**. Double-click `launch.command` on macOS, or run `python3.11 serve.py --local-only` from this directory and open the printed localhost URL. To serve your private Ethernet/Wi-Fi network, run `./launch.command`; the launcher prints the current LAN address. Keep the terminal open; Ctrl-C stops this game server. `--port 8178` selects another port. Do not open index.html directly.

No npm/pip installation or model downloads. Three.js 0.187.0 is vendored unchanged with its MIT license. The LAN server serves only the selected immutable runtime; working files, receipts and directory listings are excluded.

## Source, release and deployment

`vnext/` contains the maintained game source and runtime assets. `builds/v0.10.0/` is the immutable Encore release: 77 files, manifest SHA-256 `646052e7f8d9944b5d0c3d25041c8ea6e8138a25d5e0116d0edc753942993f15`. The earlier v0.9.1 build is preserved unchanged. `python3.11 verify_release.py` checks every frozen hash and source copy. To make a new release, increment VERSION and entry/module cache keys, integrate accepted media, freeze with `freeze_vnext.py`, update CURRENT_RELEASE.json after exact-build review, and explicitly add its approved files to .gitignore’s publication allowlist. Existing frozen builds are never overwritten.

`python3.11 publish_pages.py` prepares only the release’s allowlisted files and public notices under .publish/site. `python3.11 publish_pages.py --push` commits that tree to gh-pages and pushes it to the existing origin. GitHub Pages publishes gh-pages at its root, with .nojekyll. Source remains on main. No private production folders are published. See [publication notes](PUBLICATION.md) and [GitHub’s publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Verification and limits

Chrome 156.0.8078.81 on Familiar: a complete Encore route and reactive coda, final rendered music, changing expressions, contained films, save/replay, media recovery and original spatial-game regression. The Developer completed a sound-on original route without Spatial Assist, including real votes, Cortex connections, gravity/stairs and the physical reciprocal ending. All 77 frozen hashes and the extracted portable package passed. See the concise [verification record](VERIFICATION.md) for independent review scope and deployment evidence.

Audio decoding, signal and transport were verified; reviewers could not perceptually hear through their tools, so artistic listening and speaker output are not claimed approved. The three original 512×288 films retain softness/streaks. The three new 768×448 films show partial choreography: drifting masks, a dispersing cloud and fluttering paper birds; none is claimed seamless. Each is 4.041667 seconds. Desktop Chrome is tested; 390 px phone layouts clip outer portraits in the three-character shot, and touch/other browsers/full assistive-technology access are not established. Reduced Motion holds decorative films while necessary spatial gameplay still moves.

## Credits and assets

A standalone Music and Madness interpretation, not a change to campaign canon. Developer: implementation/integration; Designer: worlds, portraits, art/films and visual review; Aurora: creative direction, music and voices; QA: independent functional review. See [asset provenance](ASSET_PROVENANCE.md). Local production used FLUX.2 Klein, Wan2.2, MiniMax-Music3, Qwen3-TTS, Blender and PhotoCraft. Model weights and application state are not included. Third-party license notices are retained; no blanket redistribution license is granted for campaign imagery with undocumented original rights.
