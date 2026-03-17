import fs from "fs";
import path from "path";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

interface GenerateOptions {
  text: string;
  apiKey: string;
  voiceId: string;
  outputPath: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
}

export async function generateVoiceover(
  options: GenerateOptions
): Promise<string> {
  const {
    text,
    apiKey,
    voiceId,
    outputPath,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
  } = options;

  const url = `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `ElevenLabs API error (${response.status}): ${errorBody}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, buffer);
  console.log(`Voiceover saved to ${outputPath}`);

  return outputPath;
}
