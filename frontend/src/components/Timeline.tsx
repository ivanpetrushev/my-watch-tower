import { useEffect, useMemo, useState } from "react";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import { getPassEventsByGroundStationId } from "../api/generated/pass-events/pass-events";
import { useCurrentGroundStationStore } from "../stores/currentGroundStationStore";
import { formatDate } from "./helpers";
import "@/styles/Timeline.scss";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PassEventEntity } from "../model";
import PassEventCard from "./PassEventCard";
import { Link } from "react-router-dom";
import FilterContainer from "./FilterContainer";
import { useFilterStore } from "../stores/filtersStore";

const calculateXPosition = (
  eventTime: string,
  beginTime: Date,
  endTime: Date
) => {
  const eventDate = new Date(eventTime);
  const totalDuration = endTime.getTime() - beginTime.getTime();
  const eventOffset = eventDate.getTime() - beginTime.getTime();
  return (eventOffset / totalDuration) * 100; // percentage
};

const calculateYPosition = (
  maxVisibleElevation: number,
  maxElevation: number
) => {
  return 100 - (maxVisibleElevation / maxElevation) * 100; // percentage from bottom
};

const calculateWidthPercentage = (
  aosTime: string,
  losTime: string,
  beginTime: Date,
  endTime: Date
) => {
  const aosDate = new Date(aosTime);
  const losDate = new Date(losTime);
  const totalDuration = endTime.getTime() - beginTime.getTime();
  const eventDuration = losDate.getTime() - aosDate.getTime();
  return (eventDuration / totalDuration) * 100; // percentage
};

const colorPalette = [
  "#FF3E3E",
  "#42FF33",
  "#33FFFF",
  "#FFFF33",
  "#FF33FF",
  "#FF8E33",
  "#B833FF",
  "#3380FF",
  "#33FFA8",
  "#FF3396",
  "#FFFFFF",
  "#FFD700",
  "#A6FFCC",
  "#80DFFF",
  "#CC99FF",
  "#FFCC99",
  "#7DF9FF",
  "#DFFF00",
  "#FF7F50",
  "#E0E0E0",
];

const getColorForSatellite = (satelliteId: number) => {
  return colorPalette[satelliteId % colorPalette.length];
};

// time ticks

const generateTimeTicks = (
  beginTime: Date,
  endTime: Date,
  windowHours: number
) => {
  const ticks: { time: Date; position: number; label: string }[] = [];

  // Determine tick interval based on window size
  let intervalMinutes: number;
  if (windowHours <= 1) {
    intervalMinutes = 10; // Every 10 minutes for 1 hour
  } else if (windowHours <= 6) {
    intervalMinutes = 30; // Every 30 minutes for up to 6 hours
  } else if (windowHours <= 12) {
    intervalMinutes = 60; // Every hour for up to 12 hours
  } else if (windowHours <= 24) {
    intervalMinutes = 120; // Every 2 hours for up to 24 hours
  } else {
    intervalMinutes = 240; // Every 4 hours for longer windows
  }

  const startTime = new Date(beginTime);
  // Round to nearest interval
  startTime.setMinutes(
    Math.ceil(startTime.getMinutes() / intervalMinutes) * intervalMinutes,
    0,
    0
  );

  let currentTime = new Date(startTime);

  while (currentTime <= endTime) {
    const position = calculateXPosition(
      currentTime.toISOString(),
      beginTime,
      endTime
    );
    const label = currentTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    ticks.push({ time: currentTime, position, label });
    currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
  }

  return ticks;
};

const generateElevationTicks = () => {
  const ticks: { elevation: number; position: number }[] = [];

  // Ticks at 0, 15, 30, 45, 60, 75, 90 degrees
  for (let elevation = 0; elevation <= 90; elevation += 15) {
    const position = calculateYPosition(elevation, 90);
    ticks.push({ elevation, position });
  }

  return ticks;
};

export default function Timeline() {
  const [windowHours, setWindowHours] = useState<number>(6);
  const windowHoursOptions = [1, 6, 12, 24, 48];
  const [focusedPassEvent, setFocusedPassEvent] =
    useState<PassEventEntity | null>(null);
  const [focusedSatelliteId, setFocusedSatelliteId] = useState<number | null>(
    null
  );
  const [beginTime, setBeginTime] = useState<Date>(new Date());
  const endTime = useMemo(() => {
    const end = new Date(beginTime);
    end.setHours(end.getHours() + windowHours);
    return end;
  }, [beginTime, windowHours]);
  // const { filters } = useSatelliteFilterStore();
  // const { filters: passEventFilters } = usePassEventsFilterStore();
  const {satelliteFilters, passEventFilters} = useFilterStore();
  const { data: groundStations } = useGetAllGroundStations();
  const { currentGroundStationId } = useCurrentGroundStationStore();

  // Use infinite query to fetch all pages
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [
        "pass-events-timeline",
        currentGroundStationId,
        satelliteFilters,
        passEventFilters,
        beginTime.toISOString(),
        endTime.toISOString(),
      ],
      queryFn: ({ pageParam = 1 }) =>
        getPassEventsByGroundStationId({
          page: pageParam.toString(),
          groundStationId: currentGroundStationId?.toString() || "",
          ...satelliteFilters,
          frequencyFilters: satelliteFilters.frequencyFilters
            ? JSON.stringify(satelliteFilters.frequencyFilters)
            : undefined,
          ...passEventFilters,
          timingFilters: passEventFilters.timingFilters
            ? JSON.stringify(passEventFilters.timingFilters)
            : undefined,
          beginTime: beginTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      getNextPageParam: (lastPage) => {
        if (lastPage.page < lastPage.pageCount) {
          return lastPage.page + 1;
        }
        return undefined;
      },
      initialPageParam: 1,
      enabled: !!currentGroundStationId,
    });

  // Flatten all pages into a single array
  const allPassEvents = useMemo(() => {
    if (!data) return [];
    // skip passes with elevation < 5 degrees, no need to pollute timeline
    return data.pages
      .flatMap((page) => page.items)
      .filter((event) => event.maxVisibleElevation >= 5);
  }, [data]);

  // Auto-fetch all pages on mount/filter change
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // for generating the board legend
  const uniqueSatellites = useMemo(() => {
    const satelliteMap: Record<number, string> = {};
    allPassEvents.forEach((event) => {
      satelliteMap[event.satellite.id] = event.satellite.name;
    });
    return Object.entries(satelliteMap).map(([id, name]) => ({
      id: Number(id),
      name,
    }));
  }, [allPassEvents]);

  const timeTicks = useMemo(
    () => generateTimeTicks(beginTime, endTime, windowHours),
    [beginTime, endTime, windowHours]
  );

  const elevationTicks = useMemo(() => generateElevationTicks(), []);

  return (
    <div className="timeline">
      <h2>
        Pass Events for{" "}
        {groundStations?.find((gs) => gs.id === currentGroundStationId)?.name ||
          "Selected Ground Station"}
      </h2>
      {!currentGroundStationId && (
        <p>Please select a ground station (above).</p>
      )}
      <p>All times are local times to browser.</p>
      <FilterContainer satelliteFilters={true} passFilters={true} />
      {error && <p>Error loading pass events: {String(error)}</p>}
      <div className="controls">
        <div className="begin-time">
          Start: {formatDate(beginTime.toISOString())}
        </div>
        <div className="prev-window">
          <button
            onClick={() => {
              const newBegin = new Date(beginTime);
              newBegin.setHours(newBegin.getHours() - windowHours);
              setBeginTime(newBegin);
            }}
          >
            &lt; Prev
          </button>
        </div>
        <div className="window-hours">
          Window Hours:{" "}
          <select
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
          >
            {windowHoursOptions.map((hours) => (
              <option key={hours} value={hours}>
                {hours}
              </option>
            ))}
          </select>
        </div>
        <div className="next-window">
          <button
            onClick={() => {
              const newBegin = new Date(beginTime);
              newBegin.setHours(newBegin.getHours() + windowHours);
              setBeginTime(newBegin);
            }}
          >
            Next &gt;
          </button>
        </div>
        <div className="end-time">End: {formatDate(endTime.toISOString())}</div>
      </div>

      <div className="timeline-content">
        <p>
          Select pass/satellite on timeline. Total events:{" "}
          {allPassEvents.length}
        </p>
        {/* Elevation axis (left) */}
        <div className="board-container">
          <div className="elevation-axis">
            {elevationTicks.map((tick) => (
              <div
                key={tick.elevation}
                className="elevation-tick"
                style={{ top: `${tick.position}%` }}
              >
                <span className="tick-label">{tick.elevation}°</span>
              </div>
            ))}
          </div>

          {/* Main board */}
          <div className="board">
            {/* Time grid lines (vertical) */}
            {timeTicks.map((tick, index) => (
              <div
                key={index}
                className="time-grid-line"
                style={{ left: `${tick.position}%` }}
              />
            ))}

            {/* Elevation grid lines (horizontal) */}
            {elevationTicks.map((tick) => (
              <div
                key={tick.elevation}
                className="elevation-grid-line"
                style={{ top: `${tick.position}%` }}
              />
            ))}

            {/* Pass event boxes */}
            {allPassEvents.map((event) => (
              <div
                className={`pass-box ${
                  focusedPassEvent && focusedPassEvent.id === event.id
                    ? "focused"
                    : ""
                } ${
                  focusedSatelliteId &&
                  focusedSatelliteId !== event.satellite.id
                    ? "dimmed"
                    : ""
                }`}
                key={event.id}
                style={
                  {
                    left: `${calculateXPosition(
                      event.aos,
                      beginTime,
                      endTime
                    )}%`,
                    top: `${calculateYPosition(
                      event.maxVisibleElevation,
                      90
                    )}%`,
                    width: `${calculateWidthPercentage(
                      event.aos,
                      event.los,
                      beginTime,
                      endTime
                    )}%`,
                    "--item-color": getColorForSatellite(event.satellite.id),
                  } as React.CSSProperties
                }
                onClick={() => setFocusedPassEvent(event)}
              >
                &nbsp;
              </div>
            ))}
          </div>
        </div>
        {/* Time axis (bottom) */}
        <div className="time-axis">
          {timeTicks.map((tick, index) => (
            <div
              key={index}
              className="time-tick"
              style={{ left: `${tick.position}%` }}
            >
              <span className="tick-label">{tick.label}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          {uniqueSatellites.map((sat) => (
            <div
              className={`legend-item ${
                focusedSatelliteId === sat.id ? "focused" : ""
              }`}
              key={sat.id}
              onClick={() => {
                setFocusedSatelliteId(
                  focusedSatelliteId === sat.id ? null : sat.id
                );
              }}
            >
              <span
                className="color-box"
                style={{
                  backgroundColor: getColorForSatellite(sat.id),
                }}
              ></span>
              <span className="satellite-name">{sat.name}</span>
            </div>
          ))}
        </div>
        {focusedPassEvent && (
          <Link to={`/pass-events/${focusedPassEvent.id}`}>
            <PassEventCard item={focusedPassEvent} />
          </Link>
        )}
      </div>
    </div>
  );
}
