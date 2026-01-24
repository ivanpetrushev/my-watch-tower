import { useState } from "react";
import {
  getListAllFilterPresetsQueryKey,
  useCreateFilterPreset,
  useListAllFilterPresets,
} from "../api/generated/filter-presets/filter-presets";
import { useFilterStore } from "../stores/filtersStore";
import SatelliteFilters from "./SatelliteFilters";
import PassFilters from "./PassFilters";
import "../styles/GlobalFilters.scss";
import { useQueryClient } from "@tanstack/react-query";

export default function FilterContainer({
  showSatelliteFilters,
  showPassFilters,
  showPresetOptions,
}: {
  showSatelliteFilters?: boolean;
  showPassFilters?: boolean;
  showPresetOptions?: boolean;
}) {
  const [presetName, setPresetName] = useState("");
  const queryClient = useQueryClient();
  const { data: filterPresetsData } = useListAllFilterPresets();
  const createPresetMutation = useCreateFilterPreset();
  const {
    satelliteFilters,
    passEventFilters,
    loadPreset,
  } = useFilterStore();

  const onSavePreset = () => {
    createPresetMutation.mutate(
      {
        data: {
          name: presetName,
          satelliteFilter: JSON.stringify(satelliteFilters),
          passEventFilter: JSON.stringify(passEventFilters),
        },
      },
      {
        onSuccess: () => {
          // Invalidate and refetch the presets list
          queryClient.invalidateQueries({
            queryKey: getListAllFilterPresetsQueryKey(),
          });
          setPresetName("Saved!");
          setTimeout(() => setPresetName(""), 1000);
        },
      }
    );
  };

  const onSelectPreset = (presetId: string) => {
    const selectedPreset = filterPresetsData?.find(
      (preset) => preset.id.toString() === presetId
    );
    if (selectedPreset) {
      loadPreset(selectedPreset);
    }
  };

  return (
    <div className="filter-container">
      {showSatelliteFilters && <SatelliteFilters />}
      {showPassFilters && <PassFilters />}
      {showPresetOptions && (
        <div className="filter-preset-form">
          <h3>Filter Presets</h3>
          <select
            value={
              filterPresetsData && filterPresetsData.length > 0 ? "ask" : "no"
            }
            onChange={(e) => onSelectPreset(e.target.value)}
          >
            <option disabled value="ask">
              Load preset
            </option>
            {filterPresetsData && filterPresetsData.length > 0 ? (
              filterPresetsData.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))
            ) : (
              <option disabled value="no">
                No presets saved
              </option>
            )}
          </select>
          <input
            type="text"
            placeholder="Save as..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <button
            type="button"
            disabled={!presetName.trim()}
            onClick={onSavePreset}
          >
            Save preset
          </button>
        </div>
      )}
    </div>
  );
}
