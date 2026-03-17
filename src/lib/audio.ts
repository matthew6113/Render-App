import fs from "fs";
import {
  FPS,
  HOOK_DURATION_SEC,
  MAP_DURATION_SEC,
} from "../config/types";

/**
 * Estimate MP3 duration from file size using average bitrate.
 * For accurate results, use @remotion/media-utils in the browser context.
 */
export function estimateMp3Duration(filePath: string): number {
  const stats = fs.statSync(filePath);
  const fileSizeBytes = stats.size;
  // Assume ~128kbps average bitrate for speech
  const durationSec = (fileSizeBytes * 8) / (128 * 1000);
  return durationSec;
}

/**
 * Calculate total composition duration in frames from voiceover duration.
 */
export function calculateTotalFrames(voiceoverDurationSec: number): number {
  // Add 1 second padding
  const totalSec = voiceoverDurationSec + 1;
  return Math.ceil(totalSec * FPS);
}

/**
 * Calculate section timing breakdowns.
 */
export function calculateSectionTiming(totalDurationSec: number) {
  const hookSec = HOOK_DURATION_SEC;
  const mapSec = MAP_DURATION_SEC;
  const breakdownSec = totalDurationSec - hookSec - mapSec;

  return {
    hookSec,
    hookFrames: hookSec * FPS,
    mapSec,
    mapFrames: mapSec * FPS,
    breakdownSec: Math.max(breakdownSec, 5), // minimum 5 seconds
    breakdownFrames: Math.max(Math.ceil(breakdownSec * FPS), 5 * FPS),
    totalFrames: Math.ceil(totalDurationSec * FPS),
  };
}

/**
 * Estimate script reading duration (for when no voiceover file exists yet).
 * Assumes ~150 words per minute for narration.
 */
export function estimateScriptDuration(script: string): number {
  const wordCount = script.trim().split(/\s+/).length;
  return (wordCount / 150) * 60; // seconds
}
