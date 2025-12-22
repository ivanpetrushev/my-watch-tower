import { useMemo, useState } from "react";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import { getPassEventsByGroundStationId } from "../api/generated/pass-events/pass-events";
import { useCurrentGroundStationStore } from "../stores/currentGroundStationStore";
import { useFilterStore } from "../stores/globalFiltersStore";
import { usePassEventsFilterStore } from "../stores/passEventFiltersStore";
import GlobalFilters from "./GlobalFilters";
import PassFilters from "./PassFilters";
import { formatDate } from "./helpers";
import "@/styles/Timeline.scss";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { PassEventEntity } from "../model";
import PassEventCard from "./PassEventCard";

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
  const { filters } = useFilterStore();
  const { filters: passEventFilters } = usePassEventsFilterStore();
  const { data: groundStations } = useGetAllGroundStations();
  const { currentGroundStationId } = useCurrentGroundStationStore();

  // Use infinite query to fetch all pages
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: [
      "pass-events-timeline",
      currentGroundStationId,
      filters,
      passEventFilters,
      beginTime.toISOString(),
      endTime.toISOString(),
    ],
    queryFn: ({ pageParam = 1 }) =>
      getPassEventsByGroundStationId({
        page: pageParam.toString(),
        groundStationId: currentGroundStationId?.toString() || "",
        ...filters,
        frequencyFilters: filters.frequencyFilters
          ? JSON.stringify(filters.frequencyFilters)
          : undefined,
        ...passEventFilters,
        timingFilters: passEventFilters.timingFilters
          ? JSON.stringify(passEventFilters.timingFilters)
          : undefined,
        beginTime: beginTime.toISOString().slice(0, 19).replace("T", " "),
        endTime: endTime.toISOString().slice(0, 19).replace("T", " "),
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
  useMemo(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
      <GlobalFilters />
      <PassFilters />
      {error && <p>Error loading pass events: {String(error)}</p>}
      <div className="controls">
        <div className="beginTime">
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
        <div className="windowHours">
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
        <div className="endTime">End: {formatDate(endTime.toISOString())}</div>
      </div>
      {status === "pending" && <p>Loading...</p>}
      {isFetchingNextPage && <p>Loading more...</p>}

      <div className="timeline-content">
        <p>Total events: {allPassEvents.length}</p>
        <div className="board">
          {allPassEvents.map((event) => (
            <div
              className={`pass-box ${
                focusedSatelliteId && focusedSatelliteId !== event.satellite.id
                  ? "dimmed"
                  : ""
              }`}
              key={event.id}
              style={
                {
                  left: `${calculateXPosition(event.aos, beginTime, endTime)}%`,
                  top: `${calculateYPosition(event.maxVisibleElevation, 90)}%`,
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
        {focusedPassEvent && <PassEventCard item={focusedPassEvent} />}
      </div>
    </div>
  );
}
