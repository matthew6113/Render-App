import React, { useMemo } from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
} from "remotion";

type KenBurnsVariant = "zoom-in" | "zoom-out" | "pan-left" | "pan-right";

interface KenBurnsImageProps {
  src: string;
  durationInFrames: number;
  variant?: KenBurnsVariant;
  style?: React.CSSProperties;
}

const VARIANTS: KenBurnsVariant[] = [
  "zoom-in",
  "zoom-out",
  "pan-left",
  "pan-right",
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  durationInFrames,
  variant,
  style,
}) => {
  const frame = useCurrentFrame();

  const chosenVariant = useMemo(
    () => variant ?? VARIANTS[hashString(src) % VARIANTS.length],
    [variant, src]
  );

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let transform: string;

  switch (chosenVariant) {
    case "zoom-in": {
      const scale = interpolate(progress, [0, 1], [1.0, 1.08]);
      transform = `scale(${scale})`;
      break;
    }
    case "zoom-out": {
      const scale = interpolate(progress, [0, 1], [1.08, 1.0]);
      transform = `scale(${scale})`;
      break;
    }
    case "pan-left": {
      const tx = interpolate(progress, [0, 1], [2, -2]);
      transform = `scale(1.08) translateX(${tx}%)`;
      break;
    }
    case "pan-right": {
      const tx = interpolate(progress, [0, 1], [-2, 2]);
      transform = `scale(1.08) translateX(${tx}%)`;
      break;
    }
  }

  const resolvedSrc = src.startsWith("http") ? src : staticFile(src);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "absolute",
        top: 0,
        left: 0,
        ...style,
      }}
    >
      <Img
        src={resolvedSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform,
          transformOrigin: "center center",
        }}
      />
    </div>
  );
};
