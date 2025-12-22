import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import {
  useCreateGroundStation,
  useGetGroundStationById,
  useUpdateGroundStation,
} from "../api/generated/ground-stations/ground-stations";
import HorizonCanvas from "./HorizonCanvas";

type StationFormValues = {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  // no mask here
};

export default function StationEditor({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const { register, handleSubmit, reset } = useForm<StationFormValues>();
  const [horizonMask, setHorizonMask] = useState<string>("");

  const groundStationId = id ? parseInt(id, 10) : null;
  const { data } = useGetGroundStationById(id!, {
    query: {
      enabled: mode === "edit" && groundStationId !== null,
    },
  });
  const createMutation = useCreateGroundStation();
  const updateMutation = useUpdateGroundStation();

  useEffect(() => {
    if (data && mode === "edit") {
      reset({
        name: data.name,
        latitude: data.latitude,
        longitude: data.longitude,
        altitude: data.altitude,
      });
      // setHorizonMask(data.horizonmask || "");
    }
  }, [data, mode, reset]);

  // Derive the initial horizon mask value from data
  // Only use it if user hasn't made edits yet
  const initialHorizonMask = data?.horizonmask || "";
  const displayHorizonMask = horizonMask || initialHorizonMask;

  const onSubmit = (data: StationFormValues) => {
    const payload = {
      ...data,
      horizonmask: displayHorizonMask,
    };
    console.log("Submitting station:", payload);

    if (mode === "create") {
      createMutation.mutate(
        { data: payload },
        { onSuccess: () => navigate("/stations") }
      );
      // updateMutation.mutate({ id, data: payload })
    }
    if (mode === "edit" && id) {
      updateMutation.mutate(
        { id, data: payload },
        { onSuccess: () => navigate("/stations") }
      );
    }
  };

  return (
    <div>
      <h2>{mode === "create" ? "Create New Station" : "Edit Station"}</h2>
      <form className="edit-station" onSubmit={handleSubmit(onSubmit)}>
        <div className="sections">
          <div className="left-section">
            <h3>Location</h3>
            <div>
              <label>
                <div>Name:</div>
                <input type="text" {...register("name")} />
              </label>
            </div>
            <div>
              <label>
                <div>Latitude:</div>
                <input
                  type="number"
                  step="any"
                  {...register("latitude", { valueAsNumber: true })}
                />
              </label>
            </div>
            <div>
              <label>
                <div>Longitude:</div>
                <input
                  type="number"
                  step="any"
                  {...register("longitude", { valueAsNumber: true })}
                />
              </label>
            </div>
            <div>
              <label>
                <div>Altitude:</div>
                <input
                  type="number"
                  step="any"
                  {...register("altitude", { valueAsNumber: true })}
                />
              </label>
            </div>
          </div>
          <div className="right-section">
            <h3>Horizon Mask</h3>
            <HorizonCanvas
              value={displayHorizonMask}
              onChange={setHorizonMask}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving..."
            : "Save"}
        </button>
        {/* TODO: add Delete button, if in edit mode */}
      </form>
    </div>
  );
}
