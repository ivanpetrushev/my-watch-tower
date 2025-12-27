import { useFieldArray, useForm } from "react-hook-form";
import { ChevronDown, ChevronUp, CircleX, Funnel, Trash2 } from "lucide-react";
import "@/styles/GlobalFilters.scss";
import { useEffect, useState } from "react";
import { useFilterStore, type PassFilterState } from "../stores/filtersStore";
import { useDebouncedCallback } from "@tanstack/react-pacer";

export default function PassFilters() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { passEventFilters, setPassEventFilters } = useFilterStore();
  const { register, reset, watch, control } = useForm<PassFilterState>({
    defaultValues: {
      minVisibleDuration: "0",
      minVisibleElevation: "0",
      ...passEventFilters,
      browserLocalTzOffsetMinutes: String(new Date().getTimezoneOffset()),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "timingFilters",
  });

  const addTimingFilter = () => {
    append({ minTime: "00:00", maxTime: "00:00", dows: "" });
  };

  // take care of auto-saving with debounce
  const debouncedSave = useDebouncedCallback(
    (data: PassFilterState) => {
      setPassEventFilters(data);
    },
    {
      wait: 500,
    }
  );

  useEffect(() => {
    const subscription = watch((value) => {
      debouncedSave(value as PassFilterState);
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedSave]);
  //\auto-save

  const hasActiveFilters = Object.values(passEventFilters).some(
    (value) => value !== undefined && value !== ""
  );

  // Generate summary string
  let summary = "";
  const parts = [];
  if (parseInt(passEventFilters.minVisibleElevation || "0") > 0) {
    parts.push(`+${passEventFilters.minVisibleElevation}°`);
  }
  if (parseInt(passEventFilters.minVisibleDuration || "0") > 0) {
    parts.push(`+${passEventFilters.minVisibleDuration}s`);
  }
  if (
    passEventFilters.timingFilters &&
    passEventFilters.timingFilters.length > 0
  ) {
    for (const f of passEventFilters.timingFilters) {
      let strTiming = "";
      if (f.dows) strTiming += `${f.dows}: `;
      if (f.minTime && f.maxTime) {
        strTiming += `${f.minTime}-${f.maxTime} `;
      } else if (f.minTime && !f.maxTime) {
        strTiming += `after ${f.minTime} `;
      } else if (!f.minTime && f.maxTime) {
        strTiming += `before ${f.maxTime} `;
      }
      parts.push(strTiming.trim());
    }
  }
  summary = parts.join(", ");

  return (
    <form className="pass-filters">
      <h3 onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>
          <Funnel /> Pass Filters
        </span>
        {isCollapsed && summary && <span className="summary">{summary}</span>}
        {isCollapsed ? <ChevronDown /> : <ChevronUp />}
      </h3>
      {isCollapsed && summary && (
        <div className="summary only-small">{summary}</div>
      )}
      <div className={`form-groups ${isCollapsed ? "collapsed" : ""}`}>
        <div className="form-group">
          <label htmlFor="minVisibleElevation">Min Visible Elevation (°)</label>
          <input
            id="minVisibleElevation"
            type="text"
            {...register("minVisibleElevation")}
            placeholder="e.g., 30"
          />
        </div>
        <div className="form-group">
          <label htmlFor="minVisibleDuration">Min Visible Duration (s)</label>
          <input
            id="minVisibleDuration"
            type="text"
            {...register("minVisibleDuration")}
            placeholder="e.g., 300"
          />
        </div>
        {hasActiveFilters && (
          <div className="form-group">
            <label>&nbsp;</label>
            <button
              type="reset"
              onClick={() => {
                reset();
                setPassEventFilters({});
              }}
            >
              <CircleX /> Clear
            </button>
          </div>
        )}
      </div>
      <div
        className={`timing-filters form-groups ${
          isCollapsed ? "collapsed" : ""
        }`}
      >
        <div className="multiple-container">
          <h4>Timing Filters (OR)</h4>
          {fields.map((field, index) => (
            <div key={field.id} className="timing-row">
              <input
                // would be appropriate to use 'time', but time controls in browsers are fincky to select
                type="text"
                {...register(`timingFilters.${index}.minTime`)}
                placeholder="18:00"
              />
              <span>to</span>
              <input
                type="text"
                {...register(`timingFilters.${index}.maxTime`)}
                placeholder="20:45"
              />
              <input
                type="text"
                {...register(`timingFilters.${index}.dows`)}
                placeholder="Days of week (e.g., M,T,W)"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="delete-btn"
                title="Remove filter"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addTimingFilter}
            className="add-filter-btn"
          >
            Add Timing Filter
          </button>
        </div>
      </div>
    </form>
  );
}
