# Asset provenance

Published at the project owner’s explicit request on 2026-11-05. This supersedes the earlier local-only distribution restriction for the completed game. It does not grant rights to unrelated campaign research, production masters or model weights, which remain local. The exact tested v0.9.1 runtime is unchanged; its original private flag describes the build’s creation context, not the current hosting audience.

- **Campaign-derived Aurora projection:** a reversible PhotoCraft cutout from the existing Music and Madness portrait. Its original generator/license was not documented. The original and editable mask remain local. No public-domain, ownership or blanket reuse-license claim is made.
- **Four campaign culture collages:** existing local campaign illustrations, preserved byte-for-byte in the reviewed runtime. Original licensing is undocumented; no blanket reuse license is granted.
- **Fourteen generated stills and two transparent projections:** local FLUX.2 Klein4B4bit imagery and PhotoCraft masks. Three adult fictional avatars, four environment images and invented culture art. Fictional Vesper and Ilex are new game inhabitants; all game events are a standalone interpretation.
- **Three generated films:** local Wan2.2 TI2V5B through ComfyUI. Each contains97generatedframes, encoded H.264/yuv420p512×288 at24fps, 4.041667seconds. Native softness, streaks, shape drift and hue changes are visible; no seamless-loop or precise-choreography claim. Posters and clean source stills are retained.
- **Two produced songs:** original game lyrics and local MiniMax-Music3 productions, 100.124444seconds each; stereo44.1kHz256kbpsMP3, about-16LUFS. The MiniMax model notice is in notices/LICENSE-MiniMax. The browser plays rendered music and offers no generation service.
- **Seven spoken cues:** original fictional adult synthetic voice, locally produced with Qwen3-TTS VoiceDesign/Base8bit (Apache2.0 model). No real-person voice imitation. Source model revisions and attribution are recorded in notices/MEDIA.json. No model software or weights are redistributed.
- **64-second Cortex collage:** CPU-authored edits of these own songs and voice cues. Timed captions accompany the actual voiced mix. Local ASR established text correspondence, not subjective voice or music quality.
- **Municipal moon:** original59partBlender scene, exported to optimized indexed geometry. Source/native master remains local. No third-party mesh used.
- **Renderer:** unchanged Three.js0.187.0, MIT. Full license and verified official npm package provenance accompany the vendored files. All other game renderer/UI/physics code is project-authored.

builds/v0.9.1/BUILD.json hashes every release file; assets/runtime-provenance.json within the runtime enumerates referenced media. Production prompts, native receipts, raw audio and editable masters remain preserved on Familiar, outside Git’s publication allowlist. The source and hosted game include no live API credentials, launcher accounts or campaign database.

Digital playback, frame changes, ASR and loudness measurements do not establish artistic listening quality. Reviewer hearing limitations are documented in VERIFICATION.md.
