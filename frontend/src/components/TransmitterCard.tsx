import {
  CircleQuestionMark,
  MoveDown,
  MoveUp,
  MoveVertical,
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
      {direction === "duplex" && <MoveVertical />}
      {direction === "uplink" && <MoveUp />}
      {direction === "downlink" && <MoveDown />}
      {direction === "unknown" && <CircleQuestionMark />}
      {item.uplinkLow &&
        !item.downlinkLow &&
        formatFrequency(item.uplinkLow, direction, dopplerFactor)}
      {item.downlinkLow &&
        !item.uplinkLow &&
        formatFrequency(item.downlinkLow, direction, dopplerFactor)}
      {item.uplinkLow && item.downlinkLow && (
        <>
          {formatFrequency(item.uplinkLow, direction, dopplerFactor)} -{" "}
          {formatFrequency(item.downlinkLow, direction, dopplerFactor)}
        </>
      )}
      <div>{item.description?.toString()}</div>
    </div>
  );
}
