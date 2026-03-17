import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Img,
} from "remotion";
import { AnimatedText } from "./AnimatedText";
import { ProjectLocation } from "../config/types";
import { FONT_FAMILY } from "../styles/fonts";

interface MapFlyInProps {
  location: ProjectLocation;
  durationInFrames: number;
  mapboxToken?: string;
}

/**
 * Map fly-in using Mapbox Static Images API as a fallback approach.
 * Generates multiple frames at progressively closer zoom levels
 * and crossfades between them to simulate a flyover.
 */

const SF_CENTER: [number, number] = [-122.4194, 37.7749];
const ZOOM_STEPS = 8;

function getMapUrl(
  lng: number,
  lat: number,
  zoom: number,
  pitch: number,
  bearing: number,
  token: string
): string {
  // Mapbox Static Images API
  return (
    `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/` +
    `${lng},${lat},${zoom},${bearing},${pitch}/1080x1920@2x` +
    `?access_token=${token}&logo=false&attribution=false`
  );
}

export const MapFlyIn: React.FC<MapFlyInProps> = ({
  location,
  durationInFrames,
  mapboxToken,
}) => {
  const frame = useCurrentFrame();
  const token = mapboxToken || process.env.MAPBOX_TOKEN || "";

  // Overall progress 0→1
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Interpolate camera params
  const lng = interpolate(progress, [0, 1], [SF_CENTER[0], location.lng]);
  const lat = interpolate(progress, [0, 1], [SF_CENTER[1], location.lat]);
  const zoom = interpolate(progress, [0, 1], [11, 16]);
  const pitch = interpolate(progress, [0, 1], [0, 60]);
  const bearing = interpolate(progress, [0, 1], [0, -20]);

  // Location label fades in during last 20% of animation
  const labelOpacity = interpolate(progress, [0.8, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (!token) {
    // Fallback: show a gradient placeholder with location text
    return (
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 48,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            opacity: labelOpacity,
          }}
        >
          📍 {location.neighborhood}
        </div>
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 28,
            fontWeight: 400,
            color: "rgba(255,255,255,0.7)",
            marginTop: 12,
            opacity: labelOpacity,
          }}
        >
          {location.address}
        </div>
      </AbsoluteFill>
    );
  }

  const mapUrl = getMapUrl(lng, lat, zoom, pitch, bearing, token);

  return (
    <AbsoluteFill>
      <Img
        src={mapUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Location label overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: labelOpacity,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            borderRadius: 16,
            padding: "20px 40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 42,
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            {location.neighborhood}
          </div>
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 26,
              fontWeight: 400,
              color: "rgba(255,255,255,0.8)",
              marginTop: 8,
            }}
          >
            {location.address}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
