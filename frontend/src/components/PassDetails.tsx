import { Link, useParams } from "react-router-dom";
import {
  useComparePassEventsForCurrentOrbit,
  useGetPassEventById,
} from "../api/generated/pass-events/pass-events";
import {
  formatDate,
  formatDuration,
  formatElevationClassName,
} from "./helpers";
import "@/styles/PassDetails.scss";
import { Check, ClockFading, TriangleRight } from "lucide-react";
import HorizonCanvas from "./HorizonCanvas";
import * as satellite from "satellite.js";
import type { GroundStationEntity, SatelliteEntity } from "../model";
import { useEffect, useMemo, useState } from "react";
import SegmentProgress from "./SegmentProgress";
import TransmitterCard from "./TransmitterCard";

const calculateAngle = ({
  groundStation,
  ourSatellite,
  time,
}: {
  groundStation: GroundStationEntity;
  ourSatellite: SatelliteEntity;
  time: Date;
}) => {
  const satrec = satellite.twoline2satrec(
    ourSatellite.line1,
    ourSatellite.line2
  );
  const positionAndVelocity = satellite.propagate(satrec, new Date(time));
  if (positionAndVelocity === null) {
    console.error(`Failed to propagate satellite`);
    return;
  }
  const positionEci = positionAndVelocity.position;
  const velocityEci = positionAndVelocity.velocity;

  const observerGd = {
    longitude: satellite.degreesToRadians(groundStation.longitude),
    latitude: satellite.degreesToRadians(groundStation.latitude),
    height: groundStation.altitude / 1000, // meters to km
  };

  const gmst = satellite.gstime(new Date(time));

  const positionEcf = satellite.eciToEcf(positionEci, gmst),
    observerEcf = satellite.geodeticToEcf(observerGd),
    // positionGd = satellite.eciToGeodetic(positionEci, gmst),
    lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
  const dopplerFactor = satellite.dopplerFactor(
    observerEcf,
    positionEcf,
    velocityEci
  );

  const azimuth = lookAngles.azimuth,
    elevation = lookAngles.elevation,
    rangeSat = lookAngles.rangeSat;

  if (elevation < 0) {
    // satellite is below horizon
    return;
  }
  return {
    azimuth: satellite.radiansToDegrees(azimuth),
    elevation: satellite.radiansToDegrees(elevation),
    rangeSat,
    dopplerFactor,
  };
};

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

    // Cleanup interval on unmount
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

    const pathPoints: Array<{ azimuth: number; elevation: number }> = [];
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
              <p>NORAD ID: {data?.satellite?.id}</p>
              <p>{data?.satellite?.tags.map((t) => t.name).join(", ")}</p>
            </div>

            <p>Orbit number: {data?.orbitNumber}</p>
            <div className="col">
              <h2>{data?.groundStation?.name}</h2>
              {satellitePosition && (
                <p>Range: {Math.round(satellitePosition.rangeSat)} km</p>
              )}
            </div>

            {/* TODO: satellite range, doppler shift at AOS/LOS/current time */}
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
            {/* TODO: map with satellite footprint */}
            <div className="pass-timing">
              <div className="controls">
                <div className="current-time">
                  {currentTime.toLocaleString()}
                </div>
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
            {/* TODO: satellite transmitter list */}
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
                      <h3 className="col">
                        {pass.groundStationId === data?.groundStationId && (
                          <Check />
                        )}
                        <span>{pass.groundStation.name}</span>
                      </h3>
                      <div className="col">{formatDate(pass.aos)}</div>
                      <div className="col">{formatDate(pass.los)}</div>
                      <div className="elevation col large">
                        <div
                          className={`visible ${formatElevationClassName(
                            pass.maxVisibleElevation
                          )}`}
                        >
                          <TriangleRight />{" "}
                          {pass.maxVisibleElevation.toFixed(0)}°
                        </div>
                        <div className="max">
                          ({pass.maxElevation.toFixed(0)}° max possible)
                        </div>
                      </div>
                      <div className="duration col large">
                        <div className="visible">
                          <ClockFading />{" "}
                          {formatDuration(pass.totalVisibleDuration)}
                        </div>
                        <div className="max">
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
