import { ClockFading, Sunrise, Sunset, TriangleRight } from "lucide-react";
import type { PassEventEntity } from "../model";
import { useEffect, useState } from "react";
import {
  formatDate,
  formatDuration,
  formatElevationClassName,
} from "./helpers";

export default function PassEventCard({ item }: { item: PassEventEntity }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const isCurrentlyPassing = () => {
    const aos = new Date(item.aos);
    const los = new Date(item.los);
    return currentTime >= aos && currentTime <= los;
  };

  const formatProgressPercent = (aos: string, los: string) => {
    const aosDate = new Date(aos);
    const losDate = new Date(los);
    if (currentTime < aosDate) return 0;
    if (currentTime > losDate) return 100;
    const totalDuration = losDate.getTime() - aosDate.getTime();
    const elapsedDuration = currentTime.getTime() - aosDate.getTime();
    return (elapsedDuration / totalDuration) * 100;
  };

  return (
    <div className="pass-event-card">
      <div className="header">
        <div className="aos" style={{ textAlign: "left" }}>
          <Sunrise />
          {formatDate(item.aos)}
        </div>
        <h3>{item.satellite.name}</h3>
        <div className="los" style={{ textAlign: "right" }}>
          {formatDate(item.los)} <Sunset />
        </div>
      </div>
      {isCurrentlyPassing() && (
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${formatProgressPercent(item.aos, item.los)}%` }}
          />
        </div>
      )}
      {/* how to present visible vs actual elevation for best UI/UX? */}
      <div className="details">
        <div className={`elevation `}>
          <div
            className={`visible ${formatElevationClassName(
              item.maxVisibleElevation
            )}`}
          >
            <TriangleRight /> {item.maxVisibleElevation.toFixed(0)}°
          </div>
          <div className="max">
            ({item.maxElevation.toFixed(0)}° max possible)
          </div>
        </div>
        <div className="duration">
          <div className="visible">
            <ClockFading /> {formatDuration(item.totalVisibleDuration)}
          </div>
          <div className="max">
            ({formatDuration(item.duration)} max possible)
          </div>
        </div>
      </div>
    </div>
  );
}
