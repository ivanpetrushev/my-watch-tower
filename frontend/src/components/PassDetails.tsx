import { Link, useParams } from "react-router-dom";
import {
  useComparePassEventsForCurrentOrbit,
  useGetPassEventById,
} from "../api/generated/pass-events/pass-events";
import {
  calculateAngle,
  formatDate,
  formatDuration,
  formatElevationClassName,
} from "./helpers";
import "@/styles/PassDetails.scss";
import { Check, ClockFading, TriangleRight } from "lucide-react";
import HorizonCanvas from "./HorizonCanvas";
import { useEffect, useMemo, useState } from "react";
import SegmentProgress from "./SegmentProgress";
import TransmitterCard from "./TransmitterCard";
import MapFootprint from "./MapFootprint";

export default function PassDetails() {
  const { id } = useParams();
  const [isRealtime, setIsRealtime] = useState(true);
  const { data, error, isLoading } = useGetPassEventById(id!);
  const { data: comparisonData } = useComparePassEventsForCurrentOrbit(id!);
  // TODO: on error, render error message returned from API, but first define global 404 entity response in NestJs

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update current time every second
    const interval = setInterval(() => {
      const now = new Date();
      if (isRealtime) {
        setCurrentTime(now);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRealtime]);

  // Draw current satellite position
  const satellitePosition = useMemo(() => {
    if (!data) return null;

    const pos = calculateAngle({
      groundStation: data.groundStation,
      ourSatellite: data.satellite,
      time: currentTime,
    });

    return pos || null;
  }, [currentTime, data]);

  // Draw path points
  const satellitePath = useMemo(() => {
    if (!data?.satellite || !data?.groundStation || !data?.aos || !data?.los) {
      return [];
    }

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
    const maxStepMs = 120_000; // at most 120 s between samples
    const stepMs = Math.min(
      maxStepMs,
      Math.max(minStepMs, Math.floor(rawStepMs))
    );

    for (let time = startTime; time <= endTime; time += stepMs) {
      const result = calculateAngle({
        groundStation: data.groundStation,
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

    return pathPoints;
  }, [data]);

  // Calculate step for time slider so there are ~100 steps in the whole aos-los range
  const sliderStep = useMemo(() => {
    if (!data?.aos || !data?.los) return 1000;
    const aosTime = new Date(data.aos).getTime();
    const losTime = new Date(data.los).getTime();
    const durationMs = losTime - aosTime;
    const targetSteps = 100;
    const rawStepMs = durationMs / targetSteps;
    const minStepMs = 1000; // at most 1 second step
    const maxStepMs = 120_000; // at most 120 seconds step
    return Math.min(maxStepMs, Math.max(minStepMs, Math.floor(rawStepMs)));
  }, [data]);

  return (
    <div className="pass-details">
      {isLoading && <p>Loading pass details...</p>}
      {error && <p>Error loading pass details: {String(error)}</p>}
      {data && (
        <>
          <div className="pass-header">
            <div className="col">
              <h1>{data?.satellite?.name}</h1>
              <p className="only-above-md">NORAD ID: {data?.satellite?.id}</p>
              <p className="only-above-md">
                {data?.satellite?.tags.map((t) => t.name).join(", ")}
              </p>
            </div>

            <p className="only-above-md">Orbit number: {data?.orbitNumber}</p>
            <div className="col">
              <h2>{data?.groundStation?.name}</h2>
              {satellitePosition && (
                <p>Range: {Math.round(satellitePosition.rangeSat)} km</p>
              )}
            </div>
          </div>
          <div className="sky">
            <HorizonCanvas
              value={data.groundStation.horizonmask}
              readOnly
              width={500}
              height={500}
              satellites={
                satellitePosition
                  ? [{ ...satellitePosition, label: data.satellite.name }]
                  : []
              }
              paths={
                satellitePath.length > 0
                  ? [
                      {
                        points: satellitePath,
                        color: "rgba(0, 255, 0, 0.7)",
                        label: "Pass Path",
                      },
                    ]
                  : []
              }
            ></HorizonCanvas>
            <MapFootprint
              groundStation={data.groundStation}
              satelliteLatLng={{
                latitude: satellitePosition?.latitude || 0,
                longitude: satellitePosition?.longitude || 0,
                height: satellitePosition?.height || 0,
              }}
              satellitePath={satellitePath}
            />
          </div>
          <div className="pass-timing">
            {/* TODO: AOS/LOS time (and azimuth?) */}
            <div className="controls">
              <div className="current-time">{currentTime.toLocaleString()}</div>
              <button onClick={() => setIsRealtime(!isRealtime)}>
                {isRealtime ? "Switch to Manual Time" : "Switch to Realtime"}
              </button>
            </div>
            <div className="time-slider">
              <input
                type="range"
                min={new Date(data.aos).getTime()}
                max={new Date(data.los).getTime()}
                step={sliderStep}
                value={currentTime.getTime()}
                disabled={isRealtime}
                onChange={(e) => {
                  setIsRealtime(false);
                  setCurrentTime(new Date(Number(e.target.value)));
                }}
              />
              <SegmentProgress
                aos={new Date(data.aos)}
                los={new Date(data.los)}
                visibleSegments={JSON.parse(data.visibleSegments)}
              />
            </div>
          </div>
          <div className="ground">
            <div className="transmitter-list">
              <h2>Transmitters (Doppler adjusted)</h2>
              {data.satellite.transmitters.map((tx) => (
                <TransmitterCard
                  key={tx.id}
                  item={tx}
                  dopplerFactor={satellitePosition?.dopplerFactor}
                />
              ))}
            </div>
            <div className="pass-comparison">
              {comparisonData && comparisonData.length > 0 ? (
                <div className="pass-comparison-list">
                  <h2>Comparison with other passes in the same orbit:</h2>
                  {comparisonData.map((pass) => (
                    <Link
                      key={pass.id}
                      to={`/pass-events/${pass.id}`}
                      className="pass-comparison-card"
                    >
                      <h3 className="col large">
                        {pass.groundStationId === data?.groundStationId && (
                          <Check />
                        )}
                        <span>{pass.groundStation.name}</span>
                      </h3>
                      <div className="col">{formatDate(pass.aos)}</div>
                      <div className="col">{formatDate(pass.los)}</div>
                      <div className="elevation col large content-rows">
                        <div
                          className={`visible ${formatElevationClassName(
                            pass.maxVisibleElevation
                          )}`}
                        >
                          <TriangleRight />{" "}
                          {pass.maxVisibleElevation.toFixed(0)}°
                        </div>
                        <div className="max only-above-md">
                          ({pass.maxElevation.toFixed(0)}° max possible)
                        </div>
                      </div>
                      <div className="duration col large content-rows">
                        <div className="visible">
                          <ClockFading />{" "}
                          {formatDuration(pass.totalVisibleDuration)}
                        </div>
                        <div className="max only-above-md">
                          ({formatDuration(pass.duration)} max possible)
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>No other passes found for this orbit.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
