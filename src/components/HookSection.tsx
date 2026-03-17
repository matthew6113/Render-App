import React from "react";
import { AbsoluteFill } from "remotion";
import { KenBurnsImage } from "./KenBurnsImage";
import { AnimatedText } from "./AnimatedText";
import { ProjectConfig, DEFAULT_STYLE } from "../config/types";

interface HookSectionProps {
  config: ProjectConfig;
  durationInFrames: number;
}

export const HookSection: React.FC<HookSectionProps> = ({
  config,
  durationInFrames,
}) => {
  const style = { ...DEFAULT_STYLE, ...config.style };
  const bgImage = config.renderImages[0];

  return (
    <AbsoluteFill>
      {/* Background render image with Ken Burns */}
      <KenBurnsImage
        src={bgImage}
        durationInFrames={durationInFrames}
        variant="zoom-in"
      />

      {/* Dark overlay for text readability */}
      <AbsoluteFill
        style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}
      />

      {/* Hook text centered */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 60px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            borderRadius: 20,
            padding: "32px 48px",
          }}
        >
          <AnimatedText
            text={config.hookText}
            fontSize={style.hookFontSize}
            fontWeight={800}
            animation="scale-up"
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
