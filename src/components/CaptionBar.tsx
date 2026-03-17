import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { FONT_FAMILY } from "../styles/fonts";

interface CaptionBarProps {
  text: string;
  fontSize?: number;
  accentColor?: string;
  enterDuration?: number;
}

export const CaptionBar: React.FC<CaptionBarProps> = ({
  text,
  fontSize = 32,
  accentColor = "#FF6B35",
  enterDuration = 10,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, enterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const translateY = interpolate(frame, [0, enterDuration], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 100,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          borderLeft: `4px solid ${accentColor}`,
          padding: "16px 32px",
          borderRadius: 12,
          maxWidth: "90%",
        }}
      >
        <span
          style={{
            fontFamily: FONT_FAMILY,
            fontSize,
            fontWeight: 600,
            color: "#FFFFFF",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
