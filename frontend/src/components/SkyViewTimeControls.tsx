import { useState } from "react";
import { useSkyViewTimeStore } from "../stores/skyViewTimeStore";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

export default function SkyViewTimeControls() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { isRealtime, setIsRealtime, currentTime, setCurrentTime } =
    useSkyViewTimeStore();

  const handleTimeComponentChange = (component: string, direction: number) => {
    const newDate = new Date(currentTime);
    switch (component) {
      case "year":
        newDate.setFullYear(newDate.getFullYear() + direction);
        break;
      case "month":
        newDate.setMonth(newDate.getMonth() + direction);
        break;
      case "day":
        newDate.setDate(newDate.getDate() + direction);
        break;
      case "hours":
        newDate.setHours(newDate.getHours() + direction);
        break;
      case "minutes":
        newDate.setMinutes(newDate.getMinutes() + direction);
        break;
      case "seconds":
        newDate.setSeconds(newDate.getSeconds() + direction);
        break;
      default:
        break;
    }
    setCurrentTime(newDate);
    setIsRealtime(false);
  };

  // Generate summary string
  let summary = "";
  const parts = [];
  parts.push(currentTime.toLocaleString());
  if (isRealtime) {
    parts.push("(realtime)");
  } else {
    parts.push("(manual)");
  }
  summary = parts.join(", ");

  return (
    <div className="sky-view-time-controls">
      <h3 onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>
          <Clock /> Time control
        </span>
        {isCollapsed && summary && <span className="summary">{summary}</span>}
        {isCollapsed ? <ChevronDown /> : <ChevronUp />}
      </h3>
      {isCollapsed && summary && (
        <div className="summary only-small">{summary}</div>
      )}
      <div className={`controls ${isCollapsed ? "collapsed" : ""}`}>
        <div className="ymd-group">
          <div className="time-component">
            <label>Year</label>
            <div className="inputs">
              <button onClick={() => handleTimeComponentChange("year", -1)}>
                -
              </button>
              <div className="value">{currentTime.getFullYear()}</div>
              <button onClick={() => handleTimeComponentChange("year", 1)}>
                +
              </button>
            </div>
          </div>
          <div className="time-component">
            <label>Month</label>
            <div className="inputs">
              <button onClick={() => handleTimeComponentChange("month", -1)}>
                -
              </button>
              <div className="value">{currentTime.getMonth() + 1}</div>
              <button onClick={() => handleTimeComponentChange("month", 1)}>
                +
              </button>
            </div>
          </div>
          <div className="time-component">
            <label>Day</label>
            <div className="inputs">
              <button onClick={() => handleTimeComponentChange("day", -1)}>
                -
              </button>
              <div className="value">{currentTime.getDate()}</div>
              <button onClick={() => handleTimeComponentChange("day", 1)}>
                +
              </button>
            </div>
          </div>
        </div>
        <div className="hms-group">
          <div className="time-component">
            <label>Hours</label>
            <div className="inputs">
              <button onClick={() => handleTimeComponentChange("hours", -1)}>
                -
              </button>
              <div className="value">{currentTime.getHours()}</div>
              <button onClick={() => handleTimeComponentChange("hours", 1)}>
                +
              </button>
            </div>
          </div>
          <div className="time-component">
            <label>Minutes</label>
            <div className="inputs">
              <button onClick={() => handleTimeComponentChange("minutes", -1)}>
                -
              </button>
              <div className="value">{currentTime.getMinutes()}</div>
              <button onClick={() => handleTimeComponentChange("minutes", 1)}>
                +
              </button>
            </div>
          </div>
          <div className="time-component">
            <label>Seconds</label>
            <div className="inputs">
              <button onClick={() => handleTimeComponentChange("seconds", -1)}>
                -
              </button>
              <div className="value">{currentTime.getSeconds()}</div>
              <button onClick={() => handleTimeComponentChange("seconds", 1)}>
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className={`controls ${isCollapsed ? "collapsed" : ""}`}>
        {!isRealtime && (
          <button onClick={() => setIsRealtime(true)}>Reset Realtime</button>
        )}
      </div>
    </div>
  );
}
