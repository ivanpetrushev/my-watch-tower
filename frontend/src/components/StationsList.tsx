import { Link } from "react-router-dom";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import type { GroundStationEntity } from "../model";
import "@/styles/StationsList.scss";

export default function StationsList() {
  const { data, isLoading, error } = useGetAllGroundStations();
  return (
    <div className="ground-stations">
      <div className="section-header">
        <h2>Ground Stations </h2>
        <Link to="/stations/new" className="btn green">
          + Create New Station
        </Link>
      </div>
      {isLoading && <p>Loading ground stations...</p>}
      {error && <p>Error loading ground stations: {String(error)}</p>}

      {data && (
        <div className="station-list">
          {data.map((station: GroundStationEntity) => (
            <Link key={station.id} to={`/stations/${station.id}/edit`}>
              <div className="station-card">
                {station.name} - ({station.latitude}, {station.longitude})
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
