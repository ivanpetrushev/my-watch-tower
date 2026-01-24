import "@/styles/SkyView.scss";
import { useEffect, useMemo, useState } from "react";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import { useCurrentGroundStationStore } from "../stores/currentGroundStationStore";
import { useSkyViewTimeStore } from "../stores/skyViewTimeStore";
import SkyViewTimeControls from "./SkyViewTimeControls";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getPassEventsByGroundStationId } from "../api/generated/pass-events/pass-events";
import { calculateAngle } from "./helpers";
import HorizonCanvas from "./HorizonCanvas";
import FilterContainer from "./FilterContainer";
import { useFilterStore } from "../stores/filtersStore";
import FirstRunWarnings from "./FirstRunWarnings";

const PADDING = 1 * 60 * 60 * 1000;
const CACHE_WINDOW = 4 * 60 * 60 * 1000;
const HALF_WINDOW = CACHE_WINDOW / 2;

export default function SkyView() {
  const { isRealtime, currentTime, setCurrentTime } = useSkyViewTimeStore();

  const { satelliteFilters, passEventFilters } = useFilterStore();
  // const { filters: passEventFilters } = usePassEventsFilterStore();
  const { data: groundStations } = useGetAllGroundStations();
  const { currentGroundStationId } = useCurrentGroundStationStore();

  const groundStation =
    groundStations &&
    groundStations.find((gs) => gs.id === currentGroundStationId);

  const [fetchWindow, setFetchWindow] = useState(() => ({
    start: new Date(currentTime.getTime() - HALF_WINDOW),
    end: new Date(currentTime.getTime() + HALF_WINDOW),
  }));

  // fetch window slide logic
  let activeWindow = fetchWindow; // Default to using the stored window

  const distToStart = currentTime.getTime() - fetchWindow.start.getTime();
  const distToEnd = fetchWindow.end.getTime() - currentTime.getTime();

  // Check if we need to shift
  if (distToStart < PADDING || distToEnd < PADDING) {
    const newWindow = {
      start: new Date(currentTime.getTime() - HALF_WINDOW),
      end: new Date(currentTime.getTime() + HALF_WINDOW),
    };

    setFetchWindow(newWindow);
    activeWindow = newWindow;
  }
  //\fetch window slide logic

  // fetch passes for cache window
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: [
        "pass-events-timeline",
        currentGroundStationId,
        satelliteFilters,
        passEventFilters,
        activeWindow.start.toISOString(),
        activeWindow.end.toISOString(),
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
          beginTime: activeWindow.start.toISOString(),
          endTime: activeWindow.end.toISOString(),
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

  // Auto-fetch all pages on mount/filter change
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into a single array
  const allPassEvents = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.items);
  }, [data]);
  // end of fetching API data

  const currentPassEvents = useMemo(() => {
    return allPassEvents.filter((event) => {
      const aosTime = new Date(event.aos).getTime();
      const losTime = new Date(event.los).getTime();
      const result =
        aosTime <= currentTime.getTime() && losTime >= currentTime.getTime();
      return result;
    });
  }, [allPassEvents, currentTime]);

  // drawing satellite points and paths on canvas
  // Draw current satellite position
  const satellitePositions = useMemo(() => {
    if (!currentPassEvents) return null;
    if (!groundStation) return null;

    const calculatedData = currentPassEvents.map((data) => {
      const pos = calculateAngle({
        groundStation: groundStation,
        ourSatellite: data.satellite,
        time: currentTime,
      });
      if (pos === null) {
        return null;
      }

      return {
        ...pos,
        label: data.satellite.name,
      };
    });
    return calculatedData.filter((item) => item !== null);
  }, [currentTime, currentPassEvents, groundStation]);

  // Draw path points
  const satellitePaths = useMemo(() => {
    if (!currentPassEvents || currentPassEvents.length === 0) {
      return [];
    }
    if (!groundStation) return null;

    return currentPassEvents.map((data) => {
      const pathPoints: Array<{
        azimuth: number;
        elevation: number;
        latitude: number;
        longitude: number;
        height: number;
      }> = [];
      const startTime = new Date(data.aos).getTime();
      const endTime = new Date(data.los).getTime();
      // const stepMs = 10000; // Calculate every 10 seconds
      // Choose a dynamic step based on pass duration to balance resolution and performance
      const durationMs = endTime - startTime;
      const targetPoints = 100; // Aim for ~100 points per pass
      const rawStepMs = durationMs / targetPoints;
      const minStepMs = 1000; // at most 1 Hz sampling
      const stepMs = Math.max(minStepMs, Math.floor(rawStepMs));

      for (let time = startTime; time <= endTime; time += stepMs) {
        const result = calculateAngle({
          groundStation,
          ourSatellite: data.satellite,
          time: new Date(time),
        });

        if (result) {
          pathPoints.push({
            azimuth: result.azimuth,
            elevation: result.elevation,
            latitude: result.latitude,
            longitude: result.longitude,
            height: result.height,
          });
        }
      }

      return {
        points: pathPoints,
        color: "rgba(0, 255, 0, 0.7)",
        label: data.satellite.name,
      };
    });
  }, [currentPassEvents, groundStation]);

  // current time update
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (isRealtime) {
        setCurrentTime(now);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRealtime, setCurrentTime]);

  return (
    <div className="sky-view">
      <h2>
        Sky for{" "}
        {groundStations?.find((gs) => gs.id === currentGroundStationId)?.name ||
          "Selected Ground Station"}
      </h2>
      {!groundStation && <p>Please select a ground station (above).</p>}
      <p>All times are local times to browser.</p>
      <FilterContainer showSatelliteFilters={true} showPassFilters={true} />
      <FirstRunWarnings />
      <SkyViewTimeControls />
      {groundStation && (
        <div className="canvas-container">
          <HorizonCanvas
            value={groundStation.horizonmask}
            readOnly
            width={800}
            height={800}
            satellites={satellitePositions || []}
            paths={satellitePaths || []}
          ></HorizonCanvas>
        </div>
      )}
    </div>
  );
}
