import {
  CircleQuestionMark,
  MoveDown,
  MoveUp,
} from "lucide-react";
import type { TransmitterEntity } from "../model";
import { formatFrequency, formatTxDirection } from "./helpers";
import "../styles/TransmitterCard.scss";

export default function TransmitterCard({
  item,
  dopplerFactor,
}: {
  item: TransmitterEntity;
  dopplerFactor?: number | undefined;
}) {
  const direction = formatTxDirection(item);

  return (
    <div className="transmitter-card">
      {direction === "uplink" && (
        <>
          <MoveUp /> {formatFrequency(item.uplinkLow, "uplink", dopplerFactor)}
        </>
      )}
      {direction === "downlink" && (
        <>
          <MoveDown />{" "}
          {formatFrequency(item.downlinkLow, "downlink", dopplerFactor)}
        </>
      )}
      {direction === "duplex" && (
        <>
          <MoveUp /> {formatFrequency(item.uplinkLow, "uplink", dopplerFactor)}
          <MoveDown />{" "}
          {formatFrequency(item.downlinkLow, "downlink", dopplerFactor)}
        </>
      )}
      {direction === "unknown" && (
        <>
          <CircleQuestionMark />{" "}
          {item.uplinkLow &&
            formatFrequency(item.uplinkLow, "uplink", dopplerFactor)}
          {item.downlinkLow &&
            formatFrequency(item.downlinkLow, "downlink", dopplerFactor)}
        </>
      )}
      <div>{item.description?.toString()}</div>
    </div>
  );
}
