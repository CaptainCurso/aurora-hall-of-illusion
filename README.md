# Aurora-7: Hall of Illusion — Freedom™ After Dark

**[Play the game](https://captaincurso.github.io/aurora-hall-of-illusion/?v=0.13.4)** · [Source repository](https://github.com/CaptainCurso/aurora-hall-of-illusion)

Aurora built you a civilization. It would be rude to escape it.

A first-person browser game with kinetic civic play, a velvet concierge, an impossible museum, and an interruption inside its host’s neural architecture. Choices alter the citizens and the rooms. Includes three adult fictional avatars, authored conversations, locally produced music/voices, original 3D geometry, generated artwork and six short films. The Unscheduled Encore adds three branching visual-novel chapters and a reactive coda, with twelve changing expression portraits, four scene paintings and four new tracks. No live model, account, install or external content service is needed to play.

## Play

Use desktop Chrome with WebGL2/hardware acceleration. Choose **Enter with sound** or **Enter quietly**. WASD/up-down arrows move; left-right arrows turn; drag to look; **E** interacts; **Space** pulses or jumps. Escape pauses/closes dialogue. Pause includes volume, Reduced Motion, Spatial Assist and return to room entrance. Walk into a glowing exhibition ring to enter, or aim toward it and press **E**. Start with the pink Dividend Sea ring to your left. These exhibition entrances are available immediately; the ordinary EXIT requires the three objections and Cortex choice. Highlighted action prompts are now 20–26 px. Exhibitions also relocates you without granting progress.

Known route: file three physical votes in the Dividend Sea → connect the three Cortex neurons with Space and choose a returning self → meet Vesper and give him his outward key → reverse museum gravity, climb to Ilex’s unclassified name → approach the cathedral’s ordinary door and physically walk out. No romance or moral score is required. There are unsigned, reciprocal and compromised Minister endings, plus replay.

Each browser saves its own run and preferences in localStorage. No multiplayer, telemetry, backend account or live AI service. Conversations are explicitly authored branches.

## A host’s programme

The title groups the exhibitions and the optional Encore as two acts. Exhibitions opens an authored programme; Pause groups practical settings and credits. Rooms reveal with a short dissolve, skipped in Reduced Motion, and music handoffs are bounded and cancellable. Citizen names stay compact; approach and interact to hear their written thoughts. The ordinary exit remembers your actual choices and ends without a reward chirp. The new coda tableau keeps an open centre and an eighth, uninvited chair.

Starting the exhibitions again asks for confirmation and resets only the exhibition run. Encore progress and settings remain separate. Chapter restarts also ask for confirmation; a replay retains the last completed result until it finishes.

## Playback and graphics

Graphics starts on **Auto**, which bounds the 3D rendering resolution for the display. In Pause, cycle **Graphics** to **Light** for more headroom or **High** for the earlier 3D resolution. Dialogue and controls stay crisp, and the original artwork, music and film files are unchanged. The world stops continuous rendering behind Pause/dialogue and stops rendering behind Encore.

Large world images load progressively with limited concurrent requests so music has room to stream. Short films build buffered headroom before they loop; a still frame remains visible while loading. The LAN server supports partial media requests and validated asset caching for room revisits. Slow links can still require an initial wait. Performance measurements use a host and labeled browser constraints; they do not certify a particular laptop or physical audio output.

## Optional controller

Open **Controls & comfort** on the title, or use Pause, to enable **Controller**. Keyboard and mouse always work; controller input defaults off and the preference is saved. Connect a standard browser-mapped Xbox/PlayStation-style controller and press a button so the browser detects it.

| Context | Controls |
| --- | --- |
| Explore | Left stick walk; right stick look; X / □ interact; A / × jump or pulse; Y / △ Exhibitions; Start pause |
| Menus and dialogue | D-pad / left stick select; A / × confirm; B / ○ back; Start pause; left/right adjusts a selected volume slider |
| Encore | A / × reveal, advance or choose; X / □ history; Y / △ Chapters; B / ○ back; Start pause |

Release held controls after connecting, enabling, changing rooms/menus or returning from another tab. Disconnect pauses the game; keyboard/mouse can resume immediately. Controller availability depends on the browser mapping and permission; any unavailable API is labeled. Automated coverage uses explicitly simulated standard Gamepad API input in native Chrome. Physical Xbox/PlayStation hardware has not been certified.

## The Unscheduled Encore

Choose **Begin Encore with sound** or **Read Encore quietly** on the title, or open it through Exhibitions. Aurora’s discarded faces have formed a parliament, Vesper’s teacup contains a home with its own weather, and Ilex’s abandoned names are learning to fly.

Click Continue, Enter or Space to reveal then advance; 1–9 choose; H opens the backlog; Escape pauses. Progress saves in this browser when storage is available; a visible notice reports a failed save. Use Chapters to return to the library and resume or replay. Completing the three chapters unlocks the coda. Replays keep the previous completed result until a new attempt finishes; changing a completed result makes the coda available to play again. Encore saves separately and is optional for the spatial game’s ending.

## Run locally

Requires Python **3.11**. Double-click `launch.command` on macOS, or run `python3.11 serve.py --local-only` from this directory and open the printed localhost URL. To serve your private Ethernet/Wi-Fi network, run `./launch.command`; the launcher prints the current LAN address. Keep the terminal open; Ctrl-C stops this game server. `--port 8178` selects another port. Do not open index.html directly.

No npm/pip installation or model downloads. Three.js 0.187.0 is vendored unchanged with its MIT license. The LAN server serves only the selected immutable runtime; working files, receipts and directory listings are excluded.

## Source, release and deployment

`vnext/` contains the maintained game source and runtime assets. `builds/v0.13.4/` is the immutable artistic-polish release: 81 files, manifest SHA-256 `31a67f548d10c5c060f3bfa2d8d26023e4016c624fffea6fd07a565df551b2d5`. Earlier releases are preserved unchanged. `python3.11 verify_release.py` checks every frozen hash and source copy. To make a new release, increment VERSION and entry/module cache keys, integrate accepted media, freeze with `freeze_vnext.py`, update CURRENT_RELEASE.json after exact-build review, and explicitly add its approved files to .gitignore’s publication allowlist. Existing frozen builds are never overwritten.

`python3.11 publish_pages.py` prepares only the release’s allowlisted files and public notices under .publish/site. `python3.11 publish_pages.py --push` commits that tree to gh-pages and pushes it to the existing origin. GitHub Pages publishes gh-pages at its root, with .nojekyll. Source remains on main. No private production folders are published. See [publication notes](PUBLICATION.md) and [GitHub’s publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Verification and limits

Chrome 156.0.8078.81 on Familiar: independent exact-build QA completed the original physical ending, three Encore/coda routes with all twelve expressions, changed/unchanged replay, saving/reset scope, controller and focus checks, all six native films and music handoffs. Aurora and Designer approved the presentation with precise native and carried-forward scope. All 81 frozen hashes are verified. Desktop/laptop and narrow Encore captures are documented separately; actual 200% zoom and full accessibility certification are not established. See the [verification record](VERIFICATION.md) for scope, inherited evidence and deployment checks.

Audio decoding, signal and transport were verified; reviewers could not perceptually hear through their tools, so artistic listening and speaker output are not claimed approved. The three original 512×288 films retain softness/streaks. The three new 768×448 films show partial choreography: drifting masks, a dispersing cloud and fluttering paper birds; none is claimed seamless. Each is 4.041667 seconds. Desktop Chrome is tested; 390 px Encore reading now keeps a larger active portrait and two named supporting reactions inside the stage; full phone/touch, other-browser and assistive-technology access are not established. Reduced Motion holds decorative films while necessary spatial gameplay still moves.

## Credits and assets

A standalone Music and Madness interpretation, not a change to campaign canon. Developer: implementation/integration; Designer: worlds, portraits, art/films and visual review; Aurora: creative direction, music and voices; QA: independent functional review. See [asset provenance](ASSET_PROVENANCE.md). Local production used FLUX.2 Klein, Wan2.2, MiniMax-Music3, Qwen3-TTS, Blender and PhotoCraft. Model weights and application state are not included. Third-party license notices are retained; no blanket redistribution license is granted for campaign imagery with undocumented original rights.
