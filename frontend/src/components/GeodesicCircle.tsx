import { type PolylineOptions, type LatLngExpression, Polyline } from "leaflet";
import { GeodesicCircleClass } from "leaflet.geodesic";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface GeodesicOptions extends PolylineOptions {
  wrap?: boolean;
  steps?: number;
  radius?: number; // Radius in meters
}

interface GeodesicCircleProps {
  center: LatLngExpression;
  radius: number; // Radius in meters
  options?: GeodesicOptions;
}

// interface GeodesicCircleInstance extends Polyline {
//   setLatLng?: (latlng: LatLngExpression) => this;
//   setRadius?: (radius: number) => this;
// }

export function GeodesicCircle({
  center,
  radius,
  options,
}: GeodesicCircleProps) {
  // Use a ref instead of state to hold the Leaflet instance.
  const circleRef = useRef<Polyline | null>(null);
  const map = useMap();

  // Effect 1: Lifecycle (Mount/Unmount) and Options changes
  useEffect(() => {
    // Initialize with center and radius
    const instance = new GeodesicCircleClass(center, {
      ...options,
      radius: radius,
    }).addTo(map);

    circleRef.current = instance;

    return () => {
      instance.remove();
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, options]); // Re-create if options change (like color/weight)

  // Effect 2: Handle position/radius updates efficiently
  useEffect(() => {
    if (circleRef.current) {
      // GeodesicCircle usually inherits from GeodesicLine/Polyline but has specific methods
      // or we might need to recreate it if the library doesn't support dynamic updates well.
      // However, leaflet.geodesic usually treats circles as lines with points calculated.

      // Ideally, we would update center and radius.
      // The library might not expose a simple setCenter/setRadius that recalculates points immediately
      // without some internal logic, but often setLatLngs works if we recalculate.
      // BUT, GeodesicCircle class usually handles this.

      // If the library instance supports setLatLng (for center) and setRadius:
      // (Type casting to any because types might be missing for specific plugin methods)
      const circle = circleRef.current as GeodesicCircleClass;

      if (circle.setLatLng) circle.setLatLng(center);
      if (circle.setRadius) circle.setRadius(radius);
    }
  }, [center, radius]);

  return null;
}
