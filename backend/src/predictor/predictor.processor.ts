import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as satellite from 'satellite.js';
import { PassPoint, PassSegment } from './predictor.interfaces';
import { PrismaService } from 'src/prisma/prisma.service';

interface PredictorJobData {
  satelliteId: number;
  groundStationId: number;
  dateStart: string;
  dateEnd: string;
}

@Processor('predictor')
export class PredictorConsumer extends WorkerHost {
  private readonly logger = new Logger(PredictorConsumer.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<PredictorJobData>): Promise<any> {
    const {
      satelliteId,
      groundStationId,
      dateStart,
      dateEnd,
    }: {
      satelliteId: number;
      groundStationId: number;
      dateStart: string;
      dateEnd: string;
    } = job.data;
    return this.processSatelliteOverGroundStation({
      satelliteId,
      groundStationId,
      dateStart: new Date(dateStart),
      dateEnd: new Date(dateEnd),
    });
  }

  /**
   * Converts a continuous array of position points into discrete pass segments.
   *
   * This method analyzes a time series of satellite positions and identifies
   * distinct "passes" (periods when the satellite is above the horizon).
   *
   * @param points - Array of PassPoint objects containing time, azimuth, elevation, and range data
   * @returns Array of PassSegment objects, each representing one complete pass with:
   *   - startTime: When the satellite rose above the horizon
   *   - endTime: When the satellite set below the horizon
   *   - highestElevation: Maximum elevation angle during the pass
   *   - duration: Total pass duration in seconds
   *   - points: All position points during this pass
   *
   * Algorithm:
   * - Scans through points sequentially
   * - Detects pass start when elevation > 0
   * - Tracks highest elevation during the pass
   * - Detects pass end when elevation <= 0
   * - Creates a new PassSegment for each complete pass
   */
  private pointsToPasses(points: PassPoint[]): PassSegment[] {
    let currentStepIsCounted = false;
    let passStartTime: Date | null = null;
    let passEndTime: Date | null = null;
    let passPoints: PassPoint[] = [];
    let highestElevation = 0;
    const segments: PassSegment[] = [];
    for (let i = 0; i < points.length; i++) {
      // find start of pass
      if (points[i].elevation > 0 && !currentStepIsCounted) {
        currentStepIsCounted = true;
        passStartTime = points[i].time;
        passPoints = [points[i]];
        highestElevation = points[i].elevation;
      } else if (points[i].elevation > 0 && currentStepIsCounted) {
        // continue pass
        passPoints.push(points[i]);
        if (points[i].elevation > highestElevation) {
          highestElevation = points[i].elevation;
        }
      } else if (points[i].elevation <= 0 && currentStepIsCounted) {
        // end of pass
        passEndTime = points[i - 1].time;
        segments.push({
          startTime: passStartTime!,
          endTime: passEndTime,
          highestElevation,
          points: passPoints,
          duration: Math.floor(
            (passEndTime.getTime() - passStartTime!.getTime()) / 1000,
          ),
        });
        currentStepIsCounted = false;
      }
    }
    // finish the last segment, if still ongoing (for geostationary, it may be the only segment)
    if (currentStepIsCounted && passStartTime) {
      passEndTime = points[points.length - 1].time;
      segments.push({
        startTime: passStartTime,
        endTime: passEndTime,
        highestElevation,
        points: passPoints,
        duration: Math.floor(
          (passEndTime.getTime() - passStartTime.getTime()) / 1000,
        ),
      });
    }
    return segments;
  }

  /**
   * Calculates and stores all satellite passes over a ground station for a given time period.
   *
   * This method performs a two-stage prediction process:
   * 1. Coarse prediction: Samples satellite positions every 60 seconds to identify potential passes
   * 2. Fine-grain prediction: For each detected pass, samples positions every 1 second for accuracy
   *
   * @param groundStationId - Database ID of the ground station
   * @param satelliteId - Database ID (NORAD ID) of the satellite
   * @param dateStart - Start of the prediction time window
   * @param dateEnd - End of the prediction time window
   *
   * Process:
   * - Retrieves satellite TLE data and ground station coordinates
   * - Performs coarse 60-second sampling to detect horizon crossings
   * - Refines each detected pass with 1-second sampling (±60 seconds around the pass)
   * - Applies horizon mask to determine visible segments (accounting for obstacles)
   * - Calculates orbit numbers for each pass
   * - Upserts PassEvent records to database with full pass details and visible segments
   *
   * The method stores both raw pass data (AOS/LOS times, max elevation, duration) and
   * visibility-filtered segments that account for terrain/building obstructions.
   */
  async processSatelliteOverGroundStation({
    groundStationId,
    satelliteId,
    dateStart,
    dateEnd,
  }: {
    groundStationId: number;
    satelliteId: number;
    dateStart: Date;
    dateEnd: Date;
  }): Promise<void> {
    const nowTs = new Date().getTime();
    this.logger.log(
      `STARTING predictor for SID ${satelliteId} GSID ${groundStationId}`,
    );
    const targetSatellite = await this.prisma.satellite.findUnique({
      where: { id: satelliteId },
    });
    if (!targetSatellite) {
      throw new Error('Satellite not found');
    }
    const groundStation = await this.prisma.groundStation.findUnique({
      where: { id: groundStationId },
    });
    if (!groundStation) {
      throw new Error('Ground station not found');
    }
    const satrec = satellite.twoline2satrec(
      targetSatellite.line1,
      targetSatellite.line2,
    );

    // intelligent stepSeconds calculation based on mean motion
    // LEO "fast" sats (~15 revs/day) can use 60s step, while MEO/GEO "slow" sats (~1 rev/day) don't need such precision
    const meanMotion = (satrec.no * 1440.0) / (2.0 * Math.PI); // revs per day
    let fineStepSeconds = 10;
    // this.logger.debug(
    //   `Satellite ${satelliteId} mean motion: ${satrec.no} ... ${meanMotion.toFixed(2)} revs/day`,
    // );
    if (meanMotion > 11.0) {
      fineStepSeconds = 1;
    } else {
      fineStepSeconds = 60;
    }

    const coarseAngles = await this.calculateAngles({
      groundStationId,
      satelliteId,
      dateStart,
      dateEnd,
      stepSeconds: 60,
    });
    // this.logger.debug(
    //   `${satelliteId}/${groundStationId} coarse points: ${coarseAngles.length}`,
    // );

    // separate coarse predictions into more refined passes (1s steps)
    const coarsePasses = this.pointsToPasses(coarseAngles);
    // this.logger.debug(
    //   `${satelliteId}/${groundStationId} coarse passes: ${coarsePasses.length}`,
    // );

    // create high-res predictions for each pass - begin 60 sec before and end 60 sec after
    const fineGrainPasses: {
      startTime: Date;
      endTime: Date;
      highestElevation: number;
      orbitNumber: number;
      duration: number;
      points: PassPoint[];
    }[] = [];
    for (const pass of coarsePasses) {
      const highResPoints = await this.calculateAngles({
        groundStationId,
        satelliteId,
        dateStart: new Date(pass.startTime.getTime() - 60 * 1000),
        dateEnd: new Date(pass.endTime.getTime() + 60 * 1000),
        stepSeconds: fineStepSeconds,
      });
      // this.logger.debug(
      //   `${satelliteId}/${groundStationId} high-res points for pass starting at ${pass.startTime.toISOString()} - ${pass.endTime.toISOString()}: ${highResPoints.length}`,
      // );
      // filter out below-horizon points
      const filteredHighResPoints = highResPoints.filter(
        (pt) => pt.elevation > 0,
      );
      // this.logger.debug(
      //   `${satelliteId}/${groundStationId} high-res points after filtering for pass starting at ${pass.startTime.toISOString()}: ${filteredHighResPoints.length}`,
      // );
      const maxElevation = Math.max(
        ...filteredHighResPoints.map((pt) => pt.elevation),
      );
      const startingPoint = filteredHighResPoints[0];
      const endingPoint =
        filteredHighResPoints[filteredHighResPoints.length - 1];
      fineGrainPasses.push({
        startTime: new Date(startingPoint.time.getTime()),
        endTime: new Date(endingPoint.time.getTime()),
        highestElevation: maxElevation,
        duration: Math.floor(
          (endingPoint.time.getTime() - startingPoint.time.getTime()) / 1000,
        ),
        orbitNumber: this.calculateOrbitNumber(
          satrec,
          targetSatellite?.line2,
          startingPoint.time,
        ),
        points: filteredHighResPoints,
      });
    }

    // this.logger.debug(
    //   `${satelliteId}/${groundStationId} fine-grain passes: ${fineGrainPasses.length}`,
    // );

    for (const rp of fineGrainPasses) {
      // debug
      // this.logger.debug(
      //   `Pass (orb #${rp.orbitNumber}) from ${rp.startTime.toISOString()} to ${rp.endTime.toISOString()} (max ${rp.highestElevation.toFixed(2)}°, ${rp.points.length} rough points)`,
      // );
      const obstructedSegments = this.obstructPass(
        groundStation.horizonmask,
        rp.points,
      );
      // store in DB
      const partialPassEvent = {
        satelliteId,
        groundStationId,
        orbitNumber: rp.orbitNumber,
        aos: rp.startTime,
        los: rp.endTime,
        aosTime: rp.startTime.toISOString().substring(11, 16),
        losTime: rp.endTime.toISOString().substring(11, 16),
        aosDow: ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'][
          rp.startTime.getUTCDay()
        ],
        maxElevation: rp.highestElevation,
        duration: rp.duration,
        visibleSegments: JSON.stringify(obstructedSegments),
        totalVisibleDuration: obstructedSegments.reduce(
          (sum, seg) => sum + seg.duration,
          0,
        ),
        // trying to write NULL into field with no default value would just hang the query
        maxVisibleElevation:
          obstructedSegments.length > 0
            ? Math.max(...obstructedSegments.map((seg) => seg.highestElevation))
            : 0,
      };
      // Note: for geostationary orbits this would be insufficient - the same "pass" that hangs over one spot will be counted in different "orbit numbers"
      await this.prisma.passEvent.upsert({
        where: {
          satelliteId_groundStationId_orbitNumber: {
            satelliteId,
            groundStationId,
            orbitNumber: rp.orbitNumber,
          },
        },
        update: partialPassEvent,
        create: {
          ...partialPassEvent,
        },
      });
    }
    this.logger.log(
      `ENDING predictor for SID ${satelliteId} GSID ${groundStationId} in ${
        new Date().getTime() - nowTs
      } ms`,
    );
  }

  /**
   * Filters a satellite pass by applying a horizon mask to identify visible segments.
   *
   * This method takes a complete satellite pass and breaks it into visible segments
   * by checking each position point against a horizon obstruction mask. Points where
   * the satellite is blocked by terrain or buildings are filtered out.
   *
   * @param horizonMask - A 32,400-character string (360 azimuth × 90 elevation) where:
   *   - '0' = no obstruction (visible)
   *   - '1' = obstructed by terrain/buildings
   * @param passPoints - Array of position points for a complete satellite pass
   * @returns Array of PassSegment objects representing only the visible portions:
   *   - Each segment is a continuous period where the satellite is not obstructed
   *   - Contains startTime, endTime, highestElevation, duration, and points
   *
   * Algorithm:
   * - Iterates through each position point in chronological order
   * - Checks if point is obstructed using azimuth/elevation indices into the mask
   * - Groups consecutive unobstructed points into visible segments
   * - When an obstruction is encountered, saves the current segment and starts a new one
   * - Returns only the visible segments (obstructed portions are discarded)
   */
  obstructPass(horizonMask: string, passPoints: PassPoint[]): PassSegment[] {
    // horizonMask is a string of 360 characters (each representing 1 degree of azimuth) x 90 characters (each representing 1 degree of elevation)
    // each character is either '0' (no obstruction) or '1' (obstructed)
    const segments: PassSegment[] = [];
    let currentSegmentPoints: PassPoint[] = [];
    let segmentStarted = false;

    for (const point of passPoints) {
      const azIndex = Math.floor(point.azimuth) % 360;
      const elIndex = Math.floor(point.elevation);
      const maskIndex = elIndex * 360 + azIndex;
      const isObstructed = horizonMask.charAt(maskIndex) === '1';

      if (!isObstructed) {
        // point is visible
        currentSegmentPoints.push(point);
        segmentStarted = true;
      } else if (segmentStarted) {
        // point is obstructed, but we were in a visible segment
        if (currentSegmentPoints.length > 0) {
          // save the current segment
          const duration = Math.floor(
            (currentSegmentPoints[
              currentSegmentPoints.length - 1
            ].time.getTime() -
              currentSegmentPoints[0].time.getTime()) /
              1000,
          );
          const highestElevation = Math.max(
            ...currentSegmentPoints.map((p) => p.elevation),
          );
          segments.push({
            startTime: currentSegmentPoints[0].time,
            endTime: currentSegmentPoints[currentSegmentPoints.length - 1].time,
            highestElevation,
            duration,
            // points: currentSegmentPoints, // don't insert all points in DB, will be calculated in frontend if needed
            points: [],
          });
        }
        // reset for the next segment
        currentSegmentPoints = [];
        segmentStarted = false;
      } else {
        // point is obstructed and we are in continous obstructed state, do nothing
      }
    }

    // handle any remaining points after loop
    if (currentSegmentPoints.length > 0) {
      const duration = Math.floor(
        (currentSegmentPoints[currentSegmentPoints.length - 1].time.getTime() -
          currentSegmentPoints[0].time.getTime()) /
          1000,
      );
      const highestElevation = Math.max(
        ...currentSegmentPoints.map((p) => p.elevation),
      );
      segments.push({
        startTime: currentSegmentPoints[0].time,
        endTime: currentSegmentPoints[currentSegmentPoints.length - 1].time,
        highestElevation,
        duration,
        // points: currentSegmentPoints, // don't insert all points in DB, will be calculated in frontend if needed
        points: [],
      });
    }

    return segments;
  }

  /**
   * Calculates satellite position angles (azimuth, elevation, range) as seen from a ground station.
   *
   * This method computes the look angles for a satellite at regular time intervals over a
   * specified period, using SGP4 propagation model and the satellite's TLE data.
   *
   * @param groundStationId - Database ID of the observing ground station
   * @param satelliteId - Database ID (NORAD ID) of the satellite to track
   * @param dateStart - Start of the calculation time window
   * @param dateEnd - End of the calculation time window
   * @param stepSeconds - Time interval between calculations in seconds (default: 60)
   * @returns Array of PassPoint objects containing:
   *   - time: Timestamp of the calculation
   *   - azimuth: Horizontal angle from North (0-360°)
   *   - elevation: Vertical angle above horizon (-90° to 90°)
   *   - rangeSat: Distance to satellite in kilometers
   *
   * Algorithm:
   * - Retrieves satellite TLE and ground station coordinates from database
   * - Propagates satellite position using SGP4 at each time step
   * - Converts ECI coordinates to ECF using Greenwich Mean Sidereal Time
   * - Calculates look angles from ground station's geodetic position
   * - Returns all calculated points (including below-horizon positions)
   *
   * Note: This method does NOT filter out below-horizon points - caller must filter if needed.
   */
  async calculateAngles({
    groundStationId,
    satelliteId,
    dateStart,
    dateEnd,
    stepSeconds = 60,
  }: {
    groundStationId: number;
    satelliteId: number;
    dateStart: Date;
    dateEnd: Date;
    stepSeconds?: number;
  }) {
    const groundStation = await this.prisma.groundStation.findUnique({
      where: { id: groundStationId },
    });
    const ourSatellite = await this.prisma.satellite.findUnique({
      where: { id: satelliteId },
    });
    if (!groundStation || !ourSatellite) {
      throw new Error('Ground station or satellite not found');
    }

    const satrec = satellite.twoline2satrec(
      ourSatellite.line1,
      ourSatellite.line2,
    );

    const passPoints: PassPoint[] = [];
    for (
      let time = dateStart.getTime();
      time <= dateEnd.getTime();
      time += stepSeconds * 1000
    ) {
      const positionAndVelocity = satellite.propagate(satrec, new Date(time));
      if (positionAndVelocity === null) {
        this.logger.error(
          `Failed to propagate satellite (${satelliteId}) position: ${satrec.error}}`,
        );
        continue;
      }
      const positionEci = positionAndVelocity.position;
      // const velocityEci = positionAndVelocity.velocity;

      const observerGd = {
        longitude: satellite.degreesToRadians(groundStation.longitude),
        latitude: satellite.degreesToRadians(groundStation.latitude),
        height: groundStation.altitude / 1000, // meters to km
      };

      const gmst = satellite.gstime(new Date(time));

      const positionEcf = satellite.eciToEcf(positionEci, gmst),
        // observerEcf = satellite.geodeticToEcf(observerGd),
        // positionGd = satellite.eciToGeodetic(positionEci, gmst),
        lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);
      // NOTE: in case we want to calculate doppler factor later
      // dopplerFactor = satellite.dopplerFactor(
      //   observerCoordsEcf,
      //   positionEcf,
      //   velocityEcf,
      // );

      const azimuth = lookAngles.azimuth,
        elevation = lookAngles.elevation,
        rangeSat = lookAngles.rangeSat;

      // if (elevation < 0) {
      //   // satellite is below horizon
      //   continue;
      // }
      passPoints.push({
        time: new Date(time),
        azimuth: satellite.radiansToDegrees(azimuth),
        elevation: satellite.radiansToDegrees(elevation),
        rangeSat,
      });
    }
    return passPoints;
  }

  /**
   * Calculates the current orbit number for a satellite at a specific date/time.
   *
   * This method determines which orbital revolution the satellite is on by extrapolating
   * from the TLE epoch data using the satellite's mean motion.
   *
   * @param satrec - SGP4 satellite record containing orbital parameters
   * @param tleLine2 - Line 2 of the TLE containing the base revolution number at epoch
   * @param targetDate - The date/time for which to calculate the orbit number
   * @returns The orbit/revolution number (integer) at the target date
   *
   * Algorithm:
   * - Extracts the base revolution number from TLE Line 2 (columns 64-68)
   * - Converts target date and TLE epoch to Julian dates
   * - Calculates time difference in minutes between epoch and target
   * - Uses mean motion (revolutions per day) to calculate orbits since epoch
   * - Adds to base revolution number and floors to get current orbit
   *
   * Note: Mean motion (satrec.no) is in radians per minute, so we divide by 2*pi
   * to convert to revolutions.
   */
  calculateOrbitNumber(
    satrec: satellite.SatRec,
    tleLine2: string,
    targetDate: Date,
  ): number {
    // 1. Parse the TLE using satellite.js for physics data
    // 2. Manually parse the Revolution Number from Line 2 (Columns 64-68)
    // TLE is a fixed-width format. In JS strings (0-indexed), this is index 63 to 68.
    const revNumBase = parseInt(tleLine2.substring(63, 68), 10);

    // 3. Calculate Julian Date for the Target Time
    const jdTarget = satellite.jday(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth() + 1,
      targetDate.getUTCDate(),
      targetDate.getUTCHours(),
      targetDate.getUTCMinutes(),
      targetDate.getUTCSeconds(),
    );

    // 4. Get the Julian Date of the TLE Epoch
    const jdEpoch = satrec.jdsatepoch;

    // 5. Calculate time difference in minutes
    // 1440 is the number of minutes in a day
    const minutesDiff = (jdTarget - jdEpoch) * 1440.0;

    // 6. Calculate how many revolutions happened since epoch
    // satrec.no is Mean Motion in "radians per minute"
    const revolutionsSinceEpoch = (minutesDiff * satrec.no) / (2 * Math.PI);

    // 7. Add to the base revolution number
    const currentRev = revNumBase + revolutionsSinceEpoch;

    return Math.floor(currentRev);
  }
}
