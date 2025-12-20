import "@/styles/SegmentProgress.scss";

export default function SegmentProgress({
  aos,
  los,
  visibleSegments,
}: {
  aos: Date;
  los: Date;
  visibleSegments: Array<{ startTime: string; endTime: string }>;
}) {
  const totalDuration = los.getTime() - aos.getTime();
  return (
    <div className="segment-progress">
      {visibleSegments.map((segment, index) => {
        const segmentStart = new Date(segment.startTime).getTime();
        const segmentEnd = new Date(segment.endTime).getTime();
        const leftPercent =
          ((segmentStart - aos.getTime()) / totalDuration) * 100;
        const widthPercent =
          ((segmentEnd - segmentStart) / totalDuration) * 100;
        return (
          <div
            key={index}
            className="visible-segment"
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
            }}
          ></div>
        );
      })}
    </div>
  );
}
