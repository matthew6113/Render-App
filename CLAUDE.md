# SF Reels Generator — CLAUDE.md

## Project Overview
Remotion-based tool that generates Instagram Reels (1080x1920, 30fps) about SF development projects.

## Structure
- /src/components — React components (KenBurnsImage, AnimatedText, CaptionBar, HookSection, MapFlyIn, ProjectBreakdown)
- /src/config — TypeScript types and project JSON configs
- /src/lib — Utilities (ElevenLabs API, Mapbox helpers, audio timing)
- /src/styles — Font loading
- /scripts — CLI scripts for voiceover generation and full render pipeline
- /public/projects — Per-project render images and voiceover files

## Commands
- Preview: `npx remotion preview`
- Render: `npx ts-node scripts/render-reel.ts --config src/config/example-project.json --output out/oceanwide-center.mp4`
- Generate voiceover only: `npx ts-node scripts/generate-voiceover.ts --config src/config/example-project.json`

## Key Conventions
- All configs are JSON files in /src/config/
- Render images go in /public/projects/<slug>/
- Voiceover can be "auto" (ElevenLabs) or a path to an .mp3
- Target: 1080x1920, 30fps, max 60 seconds

## Environment Variables
MAPBOX_TOKEN, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
