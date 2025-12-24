import { Calendar, Clock, MapPinHouse, Satellite, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useGetSatellites } from "../api/generated/satellites/satellites";

export default function Navbar() {
  const { data } = useGetSatellites({
    tracked: "true",
  });

  return (
    <nav>
      <div className="constrained-content">
        <ul>
          <li>
            <NavLink to="/">
              <Calendar /> <span className="only-above-md">Passes</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/timeline">
              <Clock /> <span className="only-above-md">Timeline</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/sky-view">
              <Target /> <span className="only-above-md">Sky View</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/stations">
              <MapPinHouse />{" "}
              <span className="only-above-md">Ground Stations</span>
            </NavLink>
          </li>
        </ul>
        <ul>
          <li>
            <NavLink to="/satellite-list">
              <Satellite />{" "}
              <span className="only-above-md">
                Fav Satellites{" "}
                <span className={`num ${data?.total === 0 ? "red" : ""}`}>
                  ({data?.total})
                </span>
              </span>
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
}
