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
import { useEffect, useState } from "react";
import {
  useGetAppConfigValue,
  useSetAppConfigValue,
} from "../api/generated/app-config/app-config";
import { useForm } from "react-hook-form";
import { useCurrentGroundStationStore } from "../stores/currentGroundStationStore";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";

type PublicAddressFormValues = {
  publicAddress: string;
};

export default function FilterPresetList() {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [appConfigSaved, setAppConfigSaved] = useState(false);
  const { data: filterPresetsData, isLoading } = useListAllFilterPresets();
  const { data: groundStations } = useGetAllGroundStations();
  const { data: publicAddress } = useGetAppConfigValue("ical.public_address");
  const { currentGroundStationId } = useCurrentGroundStationStore();
  const saveAppConfigMutation = useSetAppConfigValue();
  const deletePresetMutation = useRemoveFilterPreset();
  const queryClient = useQueryClient();
  const { loadPreset } = useFilterStore();
  const { register, handleSubmit, reset } = useForm<PublicAddressFormValues>();

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

  useEffect(() => {
    if (publicAddress) {
      reset({ publicAddress: publicAddress.value });
    }
  }, [publicAddress, reset]);

  const onSubmitAppConfig = (data: PublicAddressFormValues) => {
    saveAppConfigMutation.mutate(
      { key: "ical.public_address", data: { value: data.publicAddress } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["app-config"] });
          setAppConfigSaved(true);
        },
      }
    );
  };

  const constructUrl = (presetId: number, isDownload: boolean) => {
    if (!publicAddress) return "#";
    const baseUrl = publicAddress.value.endsWith("/")
      ? publicAddress.value.slice(0, -1)
      : publicAddress.value;
    return `${baseUrl}/calendar/ics/station/${currentGroundStationId}/preset/${presetId}${
      isDownload ? "/download" : ""
    }`;
  };

  if (isLoading) {
    return <div>Loading presets...</div>;
  }

  return (
    <div className="filter-preset-list">
      <h2>
        Filter Presets for{" "}
        {groundStations?.find((gs) => gs.id === currentGroundStationId)?.name ||
          "Selected Ground Station"}
      </h2>
      <p>
        Save and quickly apply custom filter combinations for satellites and
        passes.
      </p>
      <p>Export matching passes as .ics files for easy calendar export.</p>
      <p>
        Configure your public server address to enable calendar subscriptions
        from external services (like Google Calendar). For details, see the{" "}
        <a
          href="https://github.com/ivanpetrushev/my-watch-tower/blob/master/README.md#calendar-integration"
          target="_blank"
          rel="noopener noreferrer"
        >
          README
        </a>
        .
      </p>
      <form
        className="save-public-address"
        onSubmit={handleSubmit(onSubmitAppConfig)}
      >
        <label>Public Address</label>
        <input
          type="text"
          {...register("publicAddress")}
          onChange={() => setAppConfigSaved(false)}
        />
        <button type="submit">{appConfigSaved ? "Saved!" : "Save"}</button>
      </form>
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
              <a
                className="btn"
                href={constructUrl(preset.id, true)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Export
              </a>
              <a
                className="btn"
                href={constructUrl(preset.id, false)}
                target="_blank"
                rel="noopener noreferrer"
              >
                iCal Link
              </a>
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
