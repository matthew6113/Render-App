import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { generateVoiceover } from "../src/lib/elevenlabs";
import { ProjectConfig } from "../src/config/types";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf("--config");

  if (configIndex === -1 || !args[configIndex + 1]) {
    console.error("Usage: ts-node scripts/generate-voiceover.ts --config <path>");
    process.exit(1);
  }

  const configPath = args[configIndex + 1];
  const absoluteConfigPath = path.resolve(configPath);

  if (!fs.existsSync(absoluteConfigPath)) {
    console.error(`Config file not found: ${absoluteConfigPath}`);
    process.exit(1);
  }

  const config: ProjectConfig = JSON.parse(
    fs.readFileSync(absoluteConfigPath, "utf-8")
  );

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;

  if (!apiKey || !voiceId) {
    console.error(
      "Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID in .env"
    );
    process.exit(1);
  }

  // Output path: public/projects/<project-slug>/voiceover.mp3
  const projectSlug = config.projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outputPath = path.resolve(
    `public/projects/${projectSlug}/voiceover.mp3`
  );

  console.log(`Generating voiceover for "${config.projectName}"...`);
  console.log(`Script: "${config.script.substring(0, 80)}..."`);

  await generateVoiceover({
    text: config.script,
    apiKey,
    voiceId,
    outputPath,
  });

  console.log(`Done! Voiceover saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error("Error generating voiceover:", err);
  process.exit(1);
});
