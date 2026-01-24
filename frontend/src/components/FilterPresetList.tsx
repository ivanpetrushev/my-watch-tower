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

export default function FilterPresetList() {
  const { data: filterPresetsData, isLoading } = useListAllFilterPresets();
  const deletePresetMutation = useRemoveFilterPreset();
  const queryClient = useQueryClient();
  const { setSatelliteFilters, setPassEventFilters } = useFilterStore();

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
      try {
        const satelliteFilter = JSON.parse(
          selectedPreset.satelliteFilter || "{}"
        );
        const passEventFilter = JSON.parse(
          selectedPreset.passEventFilter || "{}"
        );
        setSatelliteFilters(satelliteFilter);
        setPassEventFilters(passEventFilter);
      } catch (error) {
        console.error("Error parsing preset filters:", error);
      }
    }
  };

  if (isLoading) {
    return <div>Loading presets...</div>;
  }

  return (
    <div className="filter-preset-list">
      <FilterContainer showSatelliteFilters={true} showPassFilters={true} />
      <FirstRunWarnings />
      {filterPresetsData?.map((preset) => (
        <div key={preset.id} className="filter-preset-card">
          <div className="preset-info">
            <h3>{preset.name}</h3>
          </div>
          <div className="actions">
            <button onClick={() => onSelectPreset(preset.id.toString())}>
              Load
            </button>
            <button onClick={() => handleDelete(preset.id)}>Delete</button>
          </div>
        </div>
      ))}
      {filterPresetsData && filterPresetsData.length === 0 && (
        <div>No filter presets available.</div>
      )}
    </div>
  );
}
