import { useMemo, useState } from "react";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import {
  getPassEventsByGroundStationId,
} from "../api/generated/pass-events/pass-events";
import { useCurrentGroundStationStore } from "../stores/currentGroundStationStore";
import { useFilterStore } from "../stores/globalFiltersStore";
import { usePassEventsFilterStore } from "../stores/passEventFiltersStore";
import GlobalFilters from "./GlobalFilters";
import PassFilters from "./PassFilters";
import { formatDate } from "./helpers";
import "@/styles/Timeline.scss";
import { useInfiniteQuery } from "@tanstack/react-query";

export default function Timeline() {
  const [windowHours, setWindowHours] = useState<number>(6);
  const windowHoursOptions = [1, 6, 12, 24, 48];
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
    return data.pages.flatMap((page) => page.items);
  }, [data]);

  // Auto-fetch all pages on mount/filter change
  useMemo(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
        {/* Render your timeline visualization here using allPassEvents */}
        {allPassEvents.map((event) => (
          <div key={event.id}>{event.satellite.name}</div>
        ))}
      </div>
    </div>
  );
}
