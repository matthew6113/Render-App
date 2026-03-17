import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  interpolate,
  staticFile,
} from "remotion";
import { HookSection } from "./components/HookSection";
import { MapFlyIn } from "./components/MapFlyIn";
import { ProjectBreakdown } from "./components/ProjectBreakdown";
import {
  ProjectConfig,
  FPS,
  HOOK_DURATION_SEC,
  MAP_DURATION_SEC,
  CROSSFADE_FRAMES,
} from "./config/types";
import { loadFonts } from "./styles/fonts";

interface SFProjectReelProps {
  config: ProjectConfig;
  totalDurationInFrames: number;
  voiceoverPath?: string;
}

export const SFProjectReel: React.FC<SFProjectReelProps> = ({
  config,
  totalDurationInFrames,
  voiceoverPath,
}) => {
  React.useEffect(() => {
    loadFonts();
  }, []);

  const frame = useCurrentFrame();

  const hookFrames = HOOK_DURATION_SEC * FPS;
  const mapFrames = MAP_DURATION_SEC * FPS;
  const breakdownFrames = totalDurationInFrames - hookFrames - mapFrames;

  // Section start frames
  const hookStart = 0;
  const mapStart = hookFrames - CROSSFADE_FRAMES; // overlap for crossfade
  const breakdownStart = hookFrames + mapFrames - 2 * CROSSFADE_FRAMES;

  // Crossfade opacity calculations
  // Hook fades out as map starts
  const hookOpacity = interpolate(
    frame,
    [mapStart, mapStart + CROSSFADE_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Map fades in, then fades out as breakdown starts
  const mapFadeIn = interpolate(
    frame,
    [mapStart, mapStart + CROSSFADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const mapFadeOut = interpolate(
    frame,
    [breakdownStart, breakdownStart + CROSSFADE_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const mapOpacity = Math.min(mapFadeIn, mapFadeOut);

  // Breakdown fades in
  const breakdownOpacity = interpolate(
    frame,
    [breakdownStart, breakdownStart + CROSSFADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const resolvedVoiceover = voiceoverPath
    ? voiceoverPath.startsWith("http")
      ? voiceoverPath
      : staticFile(voiceoverPath)
    : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Section 1: Hook */}
      <Sequence from={hookStart} durationInFrames={hookFrames + CROSSFADE_FRAMES}>
        <AbsoluteFill style={{ opacity: hookOpacity }}>
          <HookSection config={config} durationInFrames={hookFrames} />
        </AbsoluteFill>
      </Sequence>

      {/* Section 2: Map Fly-In */}
      <Sequence from={mapStart} durationInFrames={mapFrames + 2 * CROSSFADE_FRAMES}>
        <AbsoluteFill style={{ opacity: mapOpacity }}>
          <MapFlyIn
            location={config.location}
            durationInFrames={mapFrames}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Section 3: Project Breakdown */}
      <Sequence
        from={breakdownStart}
        durationInFrames={totalDurationInFrames - breakdownStart}
      >
        <AbsoluteFill style={{ opacity: breakdownOpacity }}>
          <ProjectBreakdown
            config={config}
            durationInFrames={totalDurationInFrames - breakdownStart}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Voiceover audio */}
      {resolvedVoiceover && (
        <Audio src={resolvedVoiceover} />
      )}
    </AbsoluteFill>
  );
};
