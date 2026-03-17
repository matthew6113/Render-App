import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { FONT_FAMILY } from "../styles/fonts";

type AnimationStyle = "scale-up" | "fade-in" | "slide-up";

interface AnimatedTextProps {
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  animation?: AnimationStyle;
  enterDuration?: number; // frames
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 64,
  fontWeight = 800,
  color = "#FFFFFF",
  animation = "scale-up",
  enterDuration = 12,
  style,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, enterDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  let animStyle: React.CSSProperties = {};

  switch (animation) {
    case "scale-up": {
      const scale = interpolate(progress, [0, 1], [0.7, 1]);
      const opacity = interpolate(progress, [0, 1], [0, 1]);
      animStyle = { transform: `scale(${scale})`, opacity };
      break;
    }
    case "fade-in": {
      animStyle = { opacity: progress };
      break;
    }
    case "slide-up": {
      const ty = interpolate(progress, [0, 1], [40, 0]);
      animStyle = { transform: `translateY(${ty}px)`, opacity: progress };
      break;
    }
  }

  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        fontSize,
        fontWeight,
        color,
        textAlign: "center",
        textShadow: "0 2px 12px rgba(0,0,0,0.7)",
        lineHeight: 1.2,
        ...animStyle,
        ...style,
      }}
    >
      {text}
    </div>
  );
};
