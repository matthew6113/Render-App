import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { ProjectConfig } from "../../config/types";

function getSlug(req: Request): string {
  const s = getSlug(req);
  return Array.isArray(s) ? s[0] : (s || "");
}

const router = Router();

const PROJECTS_DIR = path.join(__dirname, "../../../public/projects");
const CONFIGS_DIR = path.join(__dirname, "../../../src/config");

// Ensure directories exist
[PROJECTS_DIR, CONFIGS_DIR].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Multer storage: save to project-specific folder
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const slug = getSlug(req) || "uploads";
    const dir = path.join(PROJECTS_DIR, slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|webp|mp3|wav|m4a)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image and audio files are allowed"));
    }
  },
});

// GET /api/projects — list all projects
router.get("/", (_req: Request, res: Response) => {
  const files = fs.readdirSync(CONFIGS_DIR).filter((f) => f.endsWith(".json"));
  const projects = files.map((f) => {
    const config = JSON.parse(
      fs.readFileSync(path.join(CONFIGS_DIR, f), "utf-8")
    ) as ProjectConfig;
    return {
      slug: f.replace(".json", ""),
      ...config,
    };
  });
  res.json(projects);
});

// GET /api/projects/:slug — get single project config
router.get("/:slug", (req: Request, res: Response) => {
  const configPath = path.join(CONFIGS_DIR, `${getSlug(req)}.json`);
  if (!fs.existsSync(configPath)) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  res.json({ slug: getSlug(req), ...config });
});

// POST /api/projects — create new project
router.post("/", (req: Request, res: Response) => {
  const config = req.body as ProjectConfig;
  if (!config.projectName) {
    res.status(400).json({ error: "projectName is required" });
    return;
  }
  const slug = slugify(config.projectName);
  const projectDir = path.join(PROJECTS_DIR, slug);
  if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

  // Set default values
  if (!config.renderImages) config.renderImages = [];
  if (!config.captions) config.captions = [];
  if (!config.voiceover) config.voiceover = "auto";

  const configPath = path.join(CONFIGS_DIR, `${slug}.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  res.json({ slug, config });
});

// PUT /api/projects/:slug — update project config
router.put("/:slug", (req: Request, res: Response) => {
  const configPath = path.join(CONFIGS_DIR, `${getSlug(req)}.json`);
  if (!fs.existsSync(configPath)) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const config = req.body as ProjectConfig;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.json({ slug: getSlug(req), config });
});

// DELETE /api/projects/:slug — delete project
router.delete("/:slug", (req: Request, res: Response) => {
  const configPath = path.join(CONFIGS_DIR, `${getSlug(req)}.json`);
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);

  const projectDir = path.join(PROJECTS_DIR, getSlug(req));
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true });
  }
  res.json({ deleted: getSlug(req) });
});

// POST /api/projects/:slug/upload — upload images/audio
router.post(
  "/:slug/upload",
  upload.array("files", 20),
  (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const slug = getSlug(req);
    const uploaded = files.map((f) => ({
      filename: f.filename,
      path: `projects/${slug}/${f.filename}`,
      size: f.size,
      mimetype: f.mimetype,
    }));

    // Auto-update config with new image paths
    const configPath = path.join(CONFIGS_DIR, `${slug}.json`);
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(
        fs.readFileSync(configPath, "utf-8")
      ) as ProjectConfig;
      const imageFiles = uploaded.filter((f) =>
        /\.(jpg|jpeg|png|webp)$/i.test(f.filename)
      );
      const audioFiles = uploaded.filter((f) =>
        /\.(mp3|wav|m4a)$/i.test(f.filename)
      );

      if (imageFiles.length > 0) {
        config.renderImages = [
          ...config.renderImages,
          ...imageFiles.map((f) => f.path),
        ];
      }
      if (audioFiles.length > 0) {
        config.voiceover = audioFiles[0].path;
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    res.json({ uploaded });
  }
);

// GET /api/projects/:slug/images — list images for a project
router.get("/:slug/images", (req: Request, res: Response) => {
  const dir = path.join(PROJECTS_DIR, getSlug(req));
  if (!fs.existsSync(dir)) {
    res.json({ images: [] });
    return;
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  res.json({
    images: files.map((f) => ({
      filename: f,
      path: `projects/${getSlug(req)}/${f}`,
      url: `/assets/projects/${getSlug(req)}/${f}`,
    })),
  });
});

export { router as projectsRouter };
