import React, { useRef, useEffect, useState, useCallback } from "react";

interface SatellitePoint {
  azimuth: number; // 0-359
  elevation: number; // 0-90
  label: string;
  color?: string;
  latitude?: number;
  longitude?: number;
  height?: number;
}

interface SatellitePath {
  points: Array<{ azimuth: number; elevation: number }>;
  label?: string;
  color?: string;
}

interface HorizonCanvasProps {
  value?: string; // Horizon mask string
  onChange?: (newMask: string) => void;
  width?: number;
  height?: number;
  readOnly?: boolean;
  satellites?: SatellitePoint[];
  paths?: SatellitePath[];
}

export const HorizonCanvas: React.FC<HorizonCanvasProps> = ({
  value,
  onChange,
  width = 400,
  height = 400,
  readOnly = false,
  satellites = [],
  paths = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "clear">("draw");
  const [brushRadius, setBrushRadius] = useState(2);

  const maskRef = useRef<Uint8Array>(new Uint8Array(360 * 90));

  const radius = Math.min(width, height) / 2 - 20;
  const centerX = width / 2;
  const centerY = height / 2;

  // Helper: Convert Az/El to Canvas X/Y
  const azElToXY = useCallback((azimuth: number, elevation: number) => {
    const r = radius * (1 - elevation / 90);
    const angle = (azimuth - 90) * (Math.PI / 180);
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
    };
  }, [radius, centerX, centerY]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Polar Grid
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;

    // Circles (0, 15, 30, 45, 60 degrees)
    [0, 15, 30, 45, 60].forEach((deg) => {
      ctx.beginPath();
      const r = radius * (1 - deg / 90);
      ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = "#999";
      ctx.font = "10px Arial";
      ctx.fillText(`${deg}°`, centerX + 2, centerY - r - 2);
    });

    // Cardinal direction lines (N, E, S, W)
    const dirs = ["N", "E", "S", "W"];
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 - 90) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "bold 12px Arial";
      const textX = centerX + Math.cos(angle) * (radius + 15);
      const textY = centerY + Math.sin(angle) * (radius + 15);
      ctx.fillText(dirs[i], textX - 5, textY + 4);
    }

    // 2. Draw Horizon Mask (obstacles)
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    for (let el = 0; el < 90; el++) {
      for (let az = 0; az < 360; az++) {
        const idx = el * 360 + az;
        if (maskRef.current[idx] === 1) {
          const { x, y } = azElToXY(az, el);
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    // 3. Draw Satellite Paths
    paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.strokeStyle = path.color || "#0066ff";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const firstPoint = azElToXY(
        path.points[0].azimuth,
        path.points[0].elevation
      );
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < path.points.length; i++) {
        const { x, y } = azElToXY(
          path.points[i].azimuth,
          path.points[i].elevation
        );
        ctx.lineTo(x, y);
      }

      ctx.stroke();

      // Optional: Draw path label at midpoint
      if (path.label && path.points.length > 0) {
        const midIdx = Math.floor(path.points.length / 2);
        const { x, y } = azElToXY(
          path.points[midIdx].azimuth,
          path.points[midIdx].elevation
        );
        ctx.fillStyle = path.color || "#0066ff";
        ctx.font = "12px Arial";
        ctx.fillText(path.label, x + 5, y - 5);
      }
    });

    // 4. Draw Satellite Points
    satellites.forEach((sat) => {
      const { x, y } = azElToXY(sat.azimuth, sat.elevation);

      // Draw dot
      ctx.fillStyle = sat.color || "#ff6600";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = "#000";
      ctx.font = "bold 13px Arial";
      ctx.fillText(sat.label, x + 8, y - 8);
    });
  }, [width, height, satellites, paths, radius, centerX, centerY, azElToXY]);

  // Initialize mask from prop
  useEffect(() => {
    if (value && value.length === 360 * 90) {
      for (let i = 0; i < value.length; i++) {
        maskRef.current[i] = value[i] === "1" ? 1 : 0;
      }
    } else {
      maskRef.current.fill(0);
    }
    draw();
  }, [value, draw]);

  // --- Interaction Logic (disabled in readOnly mode) ---

  const paint = (clientX: number, clientY: number) => {
    if (readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius) return;

    const el = Math.round(90 * (1 - dist / radius));
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    let az = Math.round(angle + 90);
    if (az < 0) az += 360;
    if (az >= 360) az -= 360;

    // Use brushRadius instead of hardcoded value
    for (let dEl = -brushRadius; dEl <= brushRadius; dEl++) {
      for (let dAz = -brushRadius; dAz <= brushRadius; dAz++) {
        let targetEl = el + dEl;
        let targetAz = az + dAz;

        if (targetEl < 0) targetEl = 0;
        if (targetEl >= 90) targetEl = 89;
        if (targetAz < 0) targetAz += 360;
        if (targetAz >= 360) targetAz -= 360;

        const idx = targetEl * 360 + targetAz;
        maskRef.current[idx] = mode === "draw" ? 1 : 0;
      }
    }

    draw();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    setIsDrawing(true);
    paint(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (readOnly || !isDrawing) return;
    paint(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (readOnly) return;
    setIsDrawing(false);
    const str = Array.from(maskRef.current).join("");
    if (onChange) onChange(str);
  };

  const rotateImage = (degrees: number) => {
    if (readOnly) return;
    const newMask = new Uint8Array(360 * 90);

    for (let el = 0; el < 90; el++) {
      for (let az = 0; az < 360; az++) {
        let newAz = az + degrees;
        if (newAz < 0) newAz += 360;
        if (newAz >= 360) newAz -= 360;

        const oldIdx = el * 360 + az;
        const newIdx = el * 360 + newAz;
        newMask[newIdx] = maskRef.current[oldIdx];
      }
    }

    maskRef.current = newMask;
    draw();

    const str = Array.from(maskRef.current).join("");
    if (onChange) onChange(str);
  };

  // Brush size controls
  const increaseBrushSize = () => {
    setBrushRadius((prev) => Math.min(prev + 1, 10)); // Max 10
  };

  const decreaseBrushSize = () => {
    setBrushRadius((prev) => Math.max(prev - 1, 1)); // Min 1
  };

  return (
    <div>
      {!readOnly && (
        <div
          style={{
            marginBottom: "10px",
            display: "flex",
            gap: "10px",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => setMode(mode === "draw" ? "clear" : "draw")}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              backgroundColor: mode === "draw" ? "#dc3545" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Mode: {mode === "draw" ? "Draw Obstacle" : "Clear Obstacle"}
          </button>

          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <button
              type="button"
              onClick={decreaseBrushSize}
              disabled={brushRadius <= 1}
              style={{
                padding: "8px 12px",
                cursor: brushRadius <= 1 ? "not-allowed" : "pointer",
                backgroundColor: brushRadius <= 1 ? "#6c757d" : "#ffc107",
                color: "white",
                border: "none",
                borderRadius: "4px",
                opacity: brushRadius <= 1 ? 0.5 : 1,
              }}
              title="Smaller brush"
            >
              -
            </button>
            <span style={{ fontSize: "12px", color: "#666", minWidth: "80px", textAlign: "center" }}>
              Brush: {brushRadius}°
            </span>
            <button
              type="button"
              onClick={increaseBrushSize}
              disabled={brushRadius >= 10}
              style={{
                padding: "8px 12px",
                cursor: brushRadius >= 10 ? "not-allowed" : "pointer",
                backgroundColor: brushRadius >= 10 ? "#6c757d" : "#ffc107",
                color: "white",
                border: "none",
                borderRadius: "4px",
                opacity: brushRadius >= 10 ? 0.5 : 1,
              }}
              title="Larger brush"
            >
              +
            </button>
          </div>

          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => rotateImage(-1)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
              title="Rotate left 1°"
            >
              &lt;
            </button>
            <span style={{ fontSize: "12px", color: "#666" }}>Rotate</span>
            <button
              type="button"
              onClick={() => rotateImage(1)}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
              title="Rotate right 1°"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: readOnly ? "default" : "crosshair",
          border: "1px solid #ddd",
          borderRadius: "50%",
        }}
      />
    </div>
  );
};

export default HorizonCanvas;