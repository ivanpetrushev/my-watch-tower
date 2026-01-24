import {
  getListAllFilterPresetsQueryKey,
  useListAllFilterPresets,
  useRemoveFilterPreset,
} from "../api/generated/filter-presets/filter-presets";
import FilterContainer from "./FilterContainer";
import FirstRunWarnings from "./FirstRunWarnings";
import "../styles/FilterPresetList.scss";
import { useQueryClient } from "@tanstack/react-query";
import { useFilterStore } from "../stores/filtersStore";
import { useState } from "react";

export default function FilterPresetList() {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const { data: filterPresetsData, isLoading } = useListAllFilterPresets();
  const deletePresetMutation = useRemoveFilterPreset();
  const queryClient = useQueryClient();
  const { loadPreset } = useFilterStore();

  const handleDelete = (presetId: number) => {
    deletePresetMutation.mutate(
      { id: presetId.toString() },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListAllFilterPresetsQueryKey(),
          });
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
      setSelectedPresetId(presetId);
    }
  };

  if (isLoading) {
    return <div>Loading presets...</div>;
  }

  return (
    <div className="filter-preset-list">
      <h2>Filter Presets</h2>
      <p>
        Save and quickly apply custom filter combinations for satellites and
        passes.
      </p>
      <p>Export matching passes as .ics files for easy calendar integration.</p>
      <FirstRunWarnings />
      {filterPresetsData?.map((preset) => (
        <>
          <div key={preset.id} className="filter-preset-card">
            <div className="preset-info">
              <h3>{preset.name}</h3>
            </div>
            <div className="actions">
              <button onClick={() => onSelectPreset(preset.id.toString())}>
                Show
              </button>
              <button onClick={() => console.log("TODO: ical generation")}>
                Export
              </button>
              <button onClick={() => handleDelete(preset.id)}>Delete</button>
            </div>
          </div>
          {selectedPresetId === preset.id.toString() && (
            <FilterContainer
              showSatelliteFilters={true}
              showPassFilters={true}
            />
          )}
        </>
      ))}
      {filterPresetsData && filterPresetsData.length === 0 && (
        <div>
          No presets saved yet. Adjust the filters to find your desired
          satellites and passes, then save as a preset.
        </div>
      )}
    </div>
  );
}
