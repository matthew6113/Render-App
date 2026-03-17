import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Sequence,
} from "remotion";
import { KenBurnsImage } from "./KenBurnsImage";
import { CaptionBar } from "./CaptionBar";
import {
  ProjectConfig,
  DEFAULT_STYLE,
  FPS,
  IMAGE_CROSSFADE_FRAMES,
} from "../config/types";

interface ProjectBreakdownProps {
  config: ProjectConfig;
  durationInFrames: number;
}

export const ProjectBreakdown: React.FC<ProjectBreakdownProps> = ({
  config,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const style = { ...DEFAULT_STYLE, ...config.style };
  const imageCount = config.renderImages.length;

  if (imageCount === 0) return null;

  // Divide total duration evenly across images
  const framesPerImage = Math.floor(durationInFrames / imageCount);

  return (
    <AbsoluteFill>
      {config.renderImages.map((imageSrc, index) => {
        const startFrame = index * framesPerImage;
        const imageFrames =
          index === imageCount - 1
            ? durationInFrames - startFrame
            : framesPerImage;

        // Caption for this image
        const caption = config.captions.find((c) => c.imageIndex === index);

        // Crossfade: fade in during first IMAGE_CROSSFADE_FRAMES
        const localFrame = frame - startFrame;
        const fadeIn =
          index === 0
            ? 1
            : interpolate(
                localFrame,
                [0, IMAGE_CROSSFADE_FRAMES],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );

        // Only render if within visible range (with some buffer)
        if (
          localFrame < -IMAGE_CROSSFADE_FRAMES ||
          localFrame > imageFrames + IMAGE_CROSSFADE_FRAMES
        ) {
          return null;
        }

        return (
          <Sequence
            key={index}
            from={startFrame}
            durationInFrames={imageFrames}
          >
            <AbsoluteFill style={{ opacity: fadeIn }}>
              <KenBurnsImage
                src={imageSrc}
                durationInFrames={imageFrames}
              />

              {/* Dark gradient at bottom for caption readability */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "40%",
                  background:
                    "linear-gradient(transparent, rgba(0,0,0,0.6))",
                }}
              />

              {caption && (
                <CaptionBar
                  text={caption.text}
                  fontSize={style.captionFontSize}
                  accentColor={style.accentColor}
                />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
