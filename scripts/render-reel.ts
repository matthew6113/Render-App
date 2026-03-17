import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { ProjectConfig, FPS } from "../src/config/types";
import { estimateMp3Duration, calculateTotalFrames, estimateScriptDuration } from "../src/lib/audio";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");
  const outputIndex = args.indexOf("--output");

  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error(
      "Usage: ts-node scripts/render-reel.ts --config <path> [--output <path>]"
    );
    process.exit(1);
  }

  const configPath = path.resolve(args[configIndex + 1]);
  const config: ProjectConfig = JSON.parse(
    fs.readFileSync(configPath, "utf-8")
  );

  const projectSlug = config.projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const outputPath =
    outputIndex !== -1 && args[outputIndex + 1]
      ? args[outputIndex + 1]
      : `out/${projectSlug}.mp4`;

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let voiceoverPath: string | undefined;
  let totalDurationSec: number;

  // Step 1: Handle voiceover
  if (config.voiceover === "auto") {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;

    if (apiKey && voiceId) {
      console.log("Generating voiceover via ElevenLabs...");
      execSync(
        `npx ts-node scripts/generate-voiceover.ts --config "${configPath}"`,
        { stdio: "inherit" }
      );
      voiceoverPath = `projects/${projectSlug}/voiceover.mp3`;
      const absVoiceoverPath = path.resolve(`public/${voiceoverPath}`);
      totalDurationSec = estimateMp3Duration(absVoiceoverPath) + 1;
    } else {
      console.log(
        "No ElevenLabs credentials found. Estimating duration from script..."
      );
      totalDurationSec = estimateScriptDuration(config.script) + 1;
    }
  } else {
    // User-provided voiceover file
    voiceoverPath = config.voiceover;
    const absVoiceoverPath = path.resolve(`public/${voiceoverPath}`);
    if (fs.existsSync(absVoiceoverPath)) {
      totalDurationSec = estimateMp3Duration(absVoiceoverPath) + 1;
    } else {
      console.warn(
        `Voiceover file not found: ${absVoiceoverPath}. Estimating duration.`
      );
      totalDurationSec = estimateScriptDuration(config.script) + 1;
    }
  }

  // Clamp to max 60 seconds for Instagram
  totalDurationSec = Math.min(totalDurationSec, 59);
  const totalFrames = calculateTotalFrames(totalDurationSec);

  console.log(`Total duration: ${totalDurationSec.toFixed(1)}s (${totalFrames} frames)`);

  // Step 2: Render with Remotion
  const props = JSON.stringify({
    config,
    totalDurationInFrames: totalFrames,
    voiceoverPath: voiceoverPath || undefined,
  });

  console.log(`Rendering to ${outputPath}...`);

  execSync(
    `npx remotion render src/index.ts SFProjectReel "${outputPath}" --props='${props.replace(/'/g, "\\'")}'`,
    { stdio: "inherit" }
  );

  console.log(`\nDone! Reel saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error("Error rendering reel:", err);
  process.exit(1);
});
