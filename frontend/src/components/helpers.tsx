import type { TransmitterEntity } from "../model";

export const formatFrequency = (
  freq: number | null,
  direction: "uplink" | "downlink" | "duplex" | "unknown" = "unknown",
  dopplerFactor?: number | undefined
) => {
  if (freq === null) return "N/A";

  // Apply Doppler shift if factor is provided
  let freqNum = Number(freq);
  if (dopplerFactor !== undefined) {
    if (direction === "uplink") {
      freqNum = freqNum / dopplerFactor;
    } else if (direction === "downlink") {
      freqNum = freqNum * dopplerFactor;
    }
  }

  // Determine appropriate unit and precision
  let value: number;
  let unit: string;
  let precision: number;

  if (freqNum >= 1_000_000_000) {
    value = freqNum / 1_000_000_000;
    unit = "GHz";
    precision = 6;
  } else if (freqNum >= 1_000_000) {
    value = freqNum / 1_000_000;
    unit = "MHz";
    precision = 6;
  } else if (freqNum >= 1_000) {
    value = freqNum / 1_000;
    unit = "kHz";
    precision = value >= 100 ? 2 : 3;
  } else {
    value = freqNum;
    unit = "Hz";
    precision = 0; // No decimals for Hz
  }

  // Format with appropriate precision, removing trailing zeros
  const formatted = value.toFixed(precision).replace(/\.?0+$/, "");

  return `${formatted} ${unit}`;
};

export const formatDate = (dateStr: string) => {
  // if today - display only HH:mm:ss (24h format), else "YYYY-MM-DD<br />HH:mm:ss"
  const date = new Date(dateStr);
  const now = new Date();
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return <div>{date.toLocaleTimeString([], { hourCycle: "h24" })}</div>;
  } else {
    return (
      <div>
        {date.toLocaleDateString()}
        <br />
        {date.toLocaleTimeString([], { hourCycle: "h24" })}
      </div>
    );
  }
};

// 75 => "1m 15s"
// 3800 => "1h 3m 20s"
export const formatDuration = (durationSec: number) => {
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;
  let result = "";
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0) {
    result += `${minutes}m `;
  }
  result += `${seconds}s`;
  return result.trim();
};

// 0-30: "red", 31-60: "yellow", 61-90: "green"
export const formatElevationClassName = (elevation: number) => {
  if (elevation <= 30) return "red";
  if (elevation <= 60) return "yellow";
  return "green";
};

export const formatTxDirection = (
  tx: TransmitterEntity
): "uplink" | "downlink" | "duplex" | "unknown" => {
  if (tx.uplinkLow && tx.downlinkLow) {
    return "duplex";
  } else if (tx.uplinkLow) {
    return "uplink";
  } else if (tx.downlinkLow) {
    return "downlink";
  } else {
    return "unknown";
  }
};
