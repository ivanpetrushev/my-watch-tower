import { useFieldArray, useForm } from "react-hook-form";
import {
  usePassEventsFilterStore,
  type PassFilterState,
} from "../stores/passEventFiltersStore";
import { Check, ChevronDown, ChevronUp, CircleX, Funnel } from "lucide-react";
import "@/styles/GlobalFilters.scss";
import { useState } from "react";

export default function PassFilters() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { filters, setFilters } = usePassEventsFilterStore();
  const { register, handleSubmit, reset, control } = useForm<PassFilterState>({
    defaultValues: {
      minVisibleDuration: "0",
      minVisibleElevation: "0",
      ...filters,
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

  const onSubmit = (data: PassFilterState) => {
    const cleanedData = {
      ...data,
    };
    setFilters(cleanedData);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ""
  );

  // Generate summary string
  let summary = "";
  const parts = [];
  if (parseInt(filters.minVisibleElevation || "0") > 0) {
    parts.push(`+${filters.minVisibleElevation}°`);
  }
  if (parseInt(filters.minVisibleDuration || "0") > 0) {
    parts.push(`+${filters.minVisibleDuration}s`);
  }
  if (filters.timingFilters && filters.timingFilters.length > 0) {
    for (const f of filters.timingFilters) {
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
    <form className="pass-filters" onSubmit={handleSubmit(onSubmit)}>
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
        <div className="form-group">
          {/* sorry for the ugly hack :) */}
          <label>&nbsp;</label>
          <button type="submit">
            <Check /> Apply Filters
          </button>
        </div>
        {hasActiveFilters && (
          <div className="form-group">
            <label>&nbsp;</label>
            <button
              type="reset"
              onClick={() => {
                reset();
                setFilters({});
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
        <fieldset>
          <legend>Timing Filters (OR)</legend>
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
                Remove
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
        </fieldset>
      </div>
    </form>
  );
}
