import { staticFile } from "remotion";

export const FONT_FAMILY = "Inter, Montserrat, -apple-system, BlinkMacSystemFont, sans-serif";

/**
 * Load Inter font from Google Fonts.
 * Call this at composition mount time.
 */
export function loadFonts(): void {
  const link = document.createElement("link");
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);
}
