import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/MapFootprint.scss";
import type { GroundStationEntity } from "../model";
import { GeodesicCircle } from "./GeodesicCircle";
import { GeodesicLine } from "./GeodesicLine";
import { renderToStaticMarkup } from "react-dom/server";
import { divIcon } from "leaflet";
import { Satellite, TowerControl } from "lucide-react";

const EARTH_RADIUS_KM = 6371;

const calculateFootprintRadius = (heightKm: number) => {
  if (!heightKm || heightKm <= 0) return 0;
  // cos(alpha) = R / (R + h)
  const alpha = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + heightKm));
  // Arc length = R * alpha (in radians)
  // Convert to meters for Leaflet
  return EARTH_RADIUS_KM * alpha * 1000;
};

// Helper to create a custom icon from a Lucide component
const createCustomIcon = (IconComponent: React.ElementType, color: string) => {
  const iconMarkup = renderToStaticMarkup(
    <div style={{ color: color, display: "flex", justifyContent: "center" }}>
      <IconComponent size={32} fill="currentColor" />
    </div>
  );

  return divIcon({
    html: iconMarkup,
    className: "custom-marker-icon", // You might need to reset default leaflet styles in CSS
    iconSize: [32, 32],
    iconAnchor: [16, 32], // Center bottom anchor
  });
};

export default function MapFootprint({
  groundStation,
  satelliteLatLng,
  satellitePath,
}: {
  groundStation: GroundStationEntity;
  satelliteLatLng: {
    latitude: number;
    longitude: number;
    height: number;
  };
  satellitePath: Array<{
    latitude: number;
    longitude: number;
    azimuth: number;
    elevation: number;
  }>;
}) {
  const footprintRadius = calculateFootprintRadius(satelliteLatLng.height);

  // Create icons
  const groundStationIcon = createCustomIcon(TowerControl, "red");
  const satelliteIcon = createCustomIcon(Satellite, "#60a5fa"); // primary color

  return (
    <div className="map-container">
      <MapContainer
        center={[groundStation.latitude, groundStation.longitude]}
        zoom={3}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[groundStation.latitude, groundStation.longitude]}
          icon={groundStationIcon}
        ></Marker>
        <Marker
          position={[satelliteLatLng.latitude, satelliteLatLng.longitude]}
          icon={satelliteIcon}
        ></Marker>
        {/* This produces weird results for odd orbits like:
        - molniya (norad id 29249) */}
        <GeodesicCircle
          center={[satelliteLatLng.latitude, satelliteLatLng.longitude]}
          radius={footprintRadius}
        />
        <GeodesicLine
          positions={satellitePath.map((p) => [p.latitude, p.longitude])}
          options={{
            color: "red",
          }}
        />
      </MapContainer>
    </div>
  );
}
