export interface ProjectLocation {
  lat: number;
  lng: number;
  neighborhood: string;
  address: string;
}

export interface Caption {
  text: string;
  imageIndex: number;
}

export interface ProjectStyle {
  hookFontSize?: number;
  captionFontSize?: number;
  accentColor?: string;
}

export interface ProjectConfig {
  projectName: string;
  hookText: string;
  location: ProjectLocation;
  script: string;
  captions: Caption[];
  renderImages: string[];
  voiceover: string; // "auto" or path to .mp3
  style?: ProjectStyle;
}

export const DEFAULT_STYLE: Required<ProjectStyle> = {
  hookFontSize: 64,
  captionFontSize: 32,
  accentColor: "#FF6B35",
};

// Timing constants
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export const HOOK_DURATION_SEC = 3;
export const MAP_DURATION_SEC = 4;
export const CROSSFADE_FRAMES = 15;
export const IMAGE_CROSSFADE_FRAMES = 10;
export const IMAGE_DISPLAY_SEC = 5; // per render image
