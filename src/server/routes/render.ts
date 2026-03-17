import { Router, Request, Response } from "express";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { ProjectConfig, FPS } from "../../config/types";
import { estimateScriptDuration, estimateMp3Duration } from "../../lib/audio";

function getSlug(req: Request): string {
  const s = getSlug(req);
  return Array.isArray(s) ? s[0] : (s || "");
}

const router = Router();
const CONFIGS_DIR = path.join(__dirname, "../../../src/config");
const OUT_DIR = path.join(__dirname, "../../../out");
const PUBLIC_DIR = path.join(__dirname, "../../../public");

// Track active renders
const activeRenders = new Map<
  string,
  { status: string; progress: number; error?: string; outputPath?: string }
>();

// POST /api/render/:slug — start a render
router.post("/:slug", (req: Request, res: Response) => {
  const slug = getSlug(req);
  const configPath = path.join(CONFIGS_DIR, `${slug}.json`);

  if (!fs.existsSync(configPath)) {
    res.status(404).json({ error: "Project config not found" });
    return;
  }

  if (activeRenders.get(slug)?.status === "rendering") {
    res.status(409).json({ error: "Render already in progress" });
    return;
  }

  const config: ProjectConfig = JSON.parse(
    fs.readFileSync(configPath, "utf-8")
  );

  // Calculate duration
  let totalDurationSec: number;
  let voiceoverPath: string | undefined;

  if (config.voiceover && config.voiceover !== "auto") {
    const absPath = path.join(PUBLIC_DIR, config.voiceover);
    if (fs.existsSync(absPath)) {
      totalDurationSec = estimateMp3Duration(absPath) + 1;
      voiceoverPath = config.voiceover;
    } else {
      totalDurationSec = estimateScriptDuration(config.script) + 1;
    }
  } else {
    totalDurationSec = estimateScriptDuration(config.script) + 1;
  }

  totalDurationSec = Math.min(totalDurationSec, 59);
  const totalFrames = Math.ceil(totalDurationSec * FPS);
  const outputFile = path.join(OUT_DIR, `${slug}.mp4`);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  activeRenders.set(slug, { status: "rendering", progress: 0 });

  // Build props
  const props = JSON.stringify({
    config,
    totalDurationInFrames: totalFrames,
    voiceoverPath: voiceoverPath || undefined,
  });

  // Spawn Remotion render as background process
  const propsFile = path.join(OUT_DIR, `${slug}-props.json`);
  fs.writeFileSync(propsFile, props);

  const child = spawn(
    "npx",
    [
      "remotion",
      "render",
      "src/index.ts",
      "SFProjectReel",
      outputFile,
      `--props=${propsFile}`,
    ],
    {
      cwd: path.join(__dirname, "../../.."),
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";

  child.stdout.on("data", (data: Buffer) => {
    const line = data.toString();
    output += line;
    // Try to parse progress from Remotion output
    const match = line.match(/(\d+)%/);
    if (match) {
      activeRenders.set(slug, {
        status: "rendering",
        progress: parseInt(match[1], 10),
      });
    }
  });

  child.stderr.on("data", (data: Buffer) => {
    output += data.toString();
  });

  child.on("close", (code) => {
    // Clean up props file
    if (fs.existsSync(propsFile)) fs.unlinkSync(propsFile);

    if (code === 0) {
      activeRenders.set(slug, {
        status: "complete",
        progress: 100,
        outputPath: `/output/${slug}.mp4`,
      });
    } else {
      activeRenders.set(slug, {
        status: "error",
        progress: 0,
        error: output.slice(-500),
      });
    }
  });

  res.json({
    status: "started",
    slug,
    durationSec: totalDurationSec,
    totalFrames,
  });
});

// GET /api/render/:slug/status — check render status
router.get("/:slug/status", (req: Request, res: Response) => {
  const slug = getSlug(req);
  const status = activeRenders.get(slug);

  if (!status) {
    // Check if output file already exists
    const outputFile = path.join(OUT_DIR, `${slug}.mp4`);
    if (fs.existsSync(outputFile)) {
      res.json({
        status: "complete",
        progress: 100,
        outputPath: `/output/${slug}.mp4`,
      });
      return;
    }
    res.json({ status: "idle", progress: 0 });
    return;
  }
  res.json(status);
});

// GET /api/render/list — list all rendered files
router.get("/", (_req: Request, res: Response) => {
  if (!fs.existsSync(OUT_DIR)) {
    res.json({ renders: [] });
    return;
  }
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".mp4"));
  const renders = files.map((f) => {
    const stats = fs.statSync(path.join(OUT_DIR, f));
    return {
      filename: f,
      slug: f.replace(".mp4", ""),
      url: `/output/${f}`,
      size: stats.size,
      createdAt: stats.birthtime,
    };
  });
  res.json({ renders });
});

export { router as renderRouter };
