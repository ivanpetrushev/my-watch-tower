import { type PolylineOptions, type LatLngExpression, Polyline } from "leaflet";
import { GeodesicLine as GeodesicLineClass } from "leaflet.geodesic";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface GeodesicOptions extends PolylineOptions {
  wrap?: boolean;
  steps?: number;
  radius?: number;
}

interface GeodesicLineProps {
  positions: LatLngExpression[] | LatLngExpression[][];
  options?: GeodesicOptions;
}

export function GeodesicLine({ positions, options }: GeodesicLineProps) {
  // Use a ref instead of state to hold the Leaflet instance.
  // This prevents re-renders when we assign the instance.
  const geodesicRef = useRef<Polyline | null>(null);
  const map = useMap();

  // Effect 1: Lifecycle (Mount/Unmount) and Options changes
  useEffect(() => {
    const instance = new GeodesicLineClass(positions, options).addTo(map);
    geodesicRef.current = instance;

    return () => {
      instance.remove();
      geodesicRef.current = null;
    };
    // We intentionally exclude 'positions' from dependencies here to prevent
    // destroying and recreating the layer every time the satellite moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, options]);

  // Effect 2: Handle position updates efficiently
  useEffect(() => {
    if (geodesicRef.current) {
      geodesicRef.current.setLatLngs(positions);
    }
  }, [positions]);

  return null;
}