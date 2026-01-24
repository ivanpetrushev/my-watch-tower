import { Link } from "react-router-dom";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import { useGetSatellites } from "../api/generated/satellites/satellites";
import "../styles/FirstRunWarnings.scss";

export default function FirstRunWarnings() {
  const { data: groundStations } = useGetAllGroundStations();
  const { data: satellites } = useGetSatellites({
    tracked: "true",
  });
  const noGroundStations = groundStations && groundStations.length === 0;
  const noTrackedSatellites = satellites && satellites.total === 0;

  if (!noGroundStations && !noTrackedSatellites) {
    return null;
  }
  return (
    <div className="first-run-warnings">
      {noGroundStations && (
        <div className="warning-box">
          <h3>Add Your First Ground Station</h3>
          <p>
            It looks like you haven't added any ground stations yet. Please{" "}
            <Link to="/stations/new">add a ground station</Link> to start
            tracking satellite passes.
          </p>
        </div>
      )}
      {noTrackedSatellites && (
        <div className="warning-box">
          <h3>Start Tracking Satellites</h3>
          <p>
            It looks like you haven't marked any satellites as tracked yet.
            Please <Link to="/satellite-list">track satellites</Link> to start
            receiving pass notifications.
          </p>
        </div>
      )}
    </div>
  );
}
