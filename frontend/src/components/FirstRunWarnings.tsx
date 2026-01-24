import { Link } from "react-router-dom";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import { useGetSatellites } from "../api/generated/satellites/satellites";
import "../styles/FirstRunWarnings.scss";

export default function FirstRunWarnings() {
  const { data: groundStations } = useGetAllGroundStations();
  const { data: satellites } = useGetSatellites({
    tracked: "true",
  });
  return (
    <div className="first-run-warnings">
      {groundStations && groundStations.length === 0 && (
        <div className="warning-box">
          <h3>No Ground Stations Found!</h3>
          <p>
            It looks like you haven't added any ground stations yet. Please{" "}
            <Link to="/stations/new">add</Link> at least one ground station to
            start tracking satellite passes.
          </p>
        </div>
      )}
      {satellites && satellites.total === 0 && (
        <div className="warning-box">
          <h3>No Tracked Satellites Found!</h3>
          <p>
            It looks like you haven't marked any satellites as tracked yet.
            Please <Link to="/satellite-list">mark</Link> at least one satellite
            as tracked to start receiving pass notifications.
          </p>
        </div>
      )}
    </div>
  );
}
