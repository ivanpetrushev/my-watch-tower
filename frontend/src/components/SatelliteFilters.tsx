import { useFieldArray, useForm } from "react-hook-form";
import { useGetTags } from "../api/generated/tags/tags";
import "@/styles/GlobalFilters.scss";
import {
  ChevronDown,
  ChevronUp,
  CircleX,
  Funnel,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatFrequency } from "./helpers";
import { useFilterStore, type SatelliteFilterState } from "../stores/filtersStore";
import { useDebouncedCallback } from "@tanstack/react-pacer";

export default function SatelliteFilters() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { data } = useGetTags();
  const { satelliteFilters, setSatelliteFilters } = useFilterStore();
  const { register, reset, watch, control } =
    useForm<SatelliteFilterState>({
      defaultValues: {
        ...satelliteFilters,
        // Convert Hz to MHz for display
        frequencyFilters:
          satelliteFilters.frequencyFilters?.map((f) => ({
            ...f,
            min: f.min / 1_000_000,
            max: f.max / 1_000_000,
          })) || [],
      },
    });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "frequencyFilters",
  });

  const addFrequencyFilter = () => {
    append({ direction: "downlink", min: 0, max: 0 });
  };

  // take care of auto-saving with debounce
  const debouncedSave = useDebouncedCallback(
    (data: SatelliteFilterState) => {
      setSatelliteFilters(data);
    },
    {
      wait: 500,
    }
  );

  useEffect(() => {
    const subscription = watch((value) => {
      debouncedSave(value as SatelliteFilterState);
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedSave]);
  //\auto-save

  const hasActiveFilters = Object.values(satelliteFilters).some(
    (value) => value !== undefined && value !== ""
  );

  // Generate summary string
  let summary = "";
  const parts = [];
  if (satelliteFilters.name) parts.push(satelliteFilters.name);
  if (satelliteFilters.tracked !== undefined && satelliteFilters.tracked !== "")
    parts.push(satelliteFilters.tracked === "true" ? "Tracked" : "Untracked");
  if (satelliteFilters.tag) parts.push(satelliteFilters.tag);
  if (satelliteFilters.frequencyFilters && satelliteFilters.frequencyFilters.length > 0) {
    for (const f of satelliteFilters.frequencyFilters) {
      const minFreq = f.min ? formatFrequency(f.min) : "N/A";
      const maxFreq = f.max ? formatFrequency(f.max) : "N/A";
      let strMinMax = "";
      if (f.min && f.max) {
        strMinMax = `${minFreq} - ${maxFreq}`;
      } else if (f.min && !f.max) {
        strMinMax = `>= ${minFreq}`;
      } else if (!f.min && f.max) {
        strMinMax = `<= ${maxFreq}`;
      } else {
        strMinMax = "N/A";
      }
      parts.push(`${f.direction === "downlink" ? "D" : "U"}: ${strMinMax}`);
    }
  }
  summary = parts.join(", ");

  return (
    <form className="global-filters">
      <h3 onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>
          <Funnel /> Satellite Filters
        </span>
        {isCollapsed && summary && <span className="summary">{summary}</span>}
        {isCollapsed ? <ChevronDown /> : <ChevronUp />}
      </h3>
      {isCollapsed && summary && (
        <div className="summary only-small">{summary}</div>
      )}
      <div className={`form-groups ${isCollapsed ? "collapsed" : ""}`}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            {...register("name")}
            placeholder="Name or NORAD ID"
          />
        </div>
        <div className="form-group">
          <label htmlFor="tracked">Tracked</label>
          <select id="tracked" {...register("tracked")}>
            <option value="">All</option>
            <option value="true">Tracked</option>
            <option value="false">Untracked</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="tag">Tag</label>
          <select id="tag" {...register("tag")}>
            <option value="">All</option>
            {data?.map((tag) => (
              <option key={tag.id} value={tag.name}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <div className="form-group">
            <label>&nbsp;</label>
            <button
              type="reset"
              onClick={() => {
                reset();
                setSatelliteFilters({});
              }}
            >
              <CircleX /> Clear
            </button>
          </div>
        )}
      </div>
      <div
        className={`frequency-filters form-groups ${
          isCollapsed ? "collapsed" : ""
        }`}
      >
        <div className="multiple-container">
          <h4>Frequency Bands</h4>
          {fields.map((field, index) => (
            <div key={field.id} className="frequency-row">
              <div className="form-group">
                <label htmlFor={`direction-${index}`}>Direction</label>
                <select
                  id={`direction-${index}`}
                  {...register(`frequencyFilters.${index}.direction`)}
                >
                  <option value="downlink">Downlink</option>
                  <option value="uplink">Uplink</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor={`min-${index}`}>Min (MHz)</label>
                <input
                  id={`min-${index}`}
                  type="number"
                  step="0.001"
                  {...register(`frequencyFilters.${index}.min`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="form-group">
                <label htmlFor={`max-${index}`}>Max (MHz)</label>
                <input
                  id={`max-${index}`}
                  type="number"
                  step="0.001"
                  {...register(`frequencyFilters.${index}.max`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="form-group">
                <label>&nbsp;</label>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="delete-btn"
                  title="Remove filter"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addFrequencyFilter}
            className="add-filter-btn"
          >
            <Plus size={16} /> Add Frequency Filter
          </button>
        </div>
      </div>
    </form>
  );
}
