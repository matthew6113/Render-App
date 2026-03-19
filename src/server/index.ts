import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { projectsRouter } from "./routes/projects";
import { renderRouter } from "./routes/render";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve dashboard static files
app.use("/dashboard", express.static(path.join(__dirname, "../dashboard/public")));

// Serve uploaded project assets (images, voiceovers)
app.use("/assets", express.static(path.join(__dirname, "../../public")));

// Serve rendered output files
app.use("/output", express.static(path.join(__dirname, "../../out")));

// API routes
app.use("/api/projects", projectsRouter);
app.use("/api/render", renderRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Redirect root to dashboard
app.get("/", (_req, res) => {
  res.redirect("/dashboard");
});

// Ensure required directories exist
const dirs = [
  path.join(__dirname, "../../public/projects"),
  path.join(__dirname, "../../out"),
];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const server = app.listen(PORT, () => {
  console.log(`\n  🎬 SF Reels Dashboard running at http://localhost:${PORT}\n`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});
