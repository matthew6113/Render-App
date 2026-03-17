import { ProjectLocation } from "../config/types";

const SF_CENTER = { lng: -122.4194, lat: 37.7749 };

interface CameraState {
  lng: number;
  lat: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

/**
 * Get the start camera state (wide aerial view of SF).
 */
export function getStartCamera(): CameraState {
  return {
    lng: SF_CENTER.lng,
    lat: SF_CENTER.lat,
    zoom: 11,
    pitch: 0,
    bearing: 0,
  };
}

/**
 * Get the end camera state (zoomed into project location).
 */
export function getEndCamera(location: ProjectLocation): CameraState {
  return {
    lng: location.lng,
    lat: location.lat,
    zoom: 16,
    pitch: 60,
    bearing: -20,
  };
}

/**
 * Interpolate between two camera states.
 */
export function interpolateCamera(
  start: CameraState,
  end: CameraState,
  progress: number // 0 to 1
): CameraState {
  const t = progress;
  return {
    lng: start.lng + (end.lng - start.lng) * t,
    lat: start.lat + (end.lat - start.lat) * t,
    zoom: start.zoom + (end.zoom - start.zoom) * t,
    pitch: start.pitch + (end.pitch - start.pitch) * t,
    bearing: start.bearing + (end.bearing - start.bearing) * t,
  };
}

/**
 * Generate Mapbox Static Image URL for a given camera state.
 */
export function getStaticMapUrl(
  camera: CameraState,
  token: string,
  width = 1080,
  height = 1920,
  style = "mapbox/dark-v11"
): string {
  return (
    `https://api.mapbox.com/styles/v1/${style}/static/` +
    `${camera.lng.toFixed(4)},${camera.lat.toFixed(4)},${camera.zoom.toFixed(2)},${camera.bearing.toFixed(1)},${camera.pitch.toFixed(1)}` +
    `/${width}x${height}@2x` +
    `?access_token=${token}&logo=false&attribution=false`
  );
}
