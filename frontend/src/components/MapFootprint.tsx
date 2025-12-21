import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/MapFootprint.scss";
import type { GroundStationEntity } from "../model";
import { GeodesicCircle } from "./GeodesicCircle";
import { GeodesicLine } from "./GeodesicLine";

const EARTH_RADIUS_KM = 6371;

const calculateFootprintRadius = (heightKm: number) => {
  if (!heightKm || heightKm <= 0) return 0;
  // cos(alpha) = R / (R + h)
  const alpha = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + heightKm));
  // Arc length = R * alpha (in radians)
  // Convert to meters for Leaflet
  return EARTH_RADIUS_KM * alpha * 1000;
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
        ></Marker>
        <Marker
          position={[satelliteLatLng.latitude, satelliteLatLng.longitude]}
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
