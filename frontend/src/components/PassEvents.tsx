import { useState } from "react";
import { useGetPassEventsByGroundStationId } from "../api/generated/pass-events/pass-events";
import { useCurrentGroundStationStore } from "../stores/currentGroundStationStore";
import ReactPaginate from "react-paginate";
import PassEventCard from "./PassEventCard";
import "@/styles/PassEventList.scss";
import { useGetAllGroundStations } from "../api/generated/ground-stations/ground-stations";
import { Link } from "react-router-dom";
import FilterContainer from "./FilterContainer";
import { useFilterStore } from "../stores/filtersStore";
import FirstRunWarnings from "./FirstRunWarnings";

export default function PassEvents() {
  const [currentPage, setCurrentPage] = useState(1);
  const { satelliteFilters, passEventFilters } = useFilterStore();
  const { data: groundStations } = useGetAllGroundStations();
  const { currentGroundStationId } = useCurrentGroundStationStore();
  const { data, error } = useGetPassEventsByGroundStationId(
    {
      page: currentPage.toString(),
      groundStationId: currentGroundStationId?.toString() || "",
      ...satelliteFilters,
      frequencyFilters: satelliteFilters.frequencyFilters
        ? JSON.stringify(satelliteFilters.frequencyFilters)
        : undefined,
      ...passEventFilters,
      timingFilters: passEventFilters.timingFilters
        ? JSON.stringify(passEventFilters.timingFilters)
        : undefined,
    },
    {
      query: {
        enabled: !!currentGroundStationId,
      },
    }
  );

  const handlePageChange = (selectedItem: { selected: number }) => {
    // ReactPaginate uses 0-based indexing, but our API uses 1-based
    setCurrentPage(selectedItem.selected + 1);
  };

  return (
    <div>
      <h2>
        Pass Events for{" "}
        {groundStations?.find((gs) => gs.id === currentGroundStationId)?.name ||
          "Selected Ground Station"}
      </h2>
      {!currentGroundStationId && (
        <p>Please select a ground station (above).</p>
      )}
      <p>All times are local times to browser.</p>
      <FilterContainer
        showSatelliteFilters={true}
        showPassFilters={true}
        showPresetOptions={true}
      />
      <FirstRunWarnings />
      {error && <p>Error loading pass events: {String(error)}</p>}
      {data && data.items.length > 0 && (
        <>
          <div className="pass-event-list">
            {data.items.map((passEvent) => (
              <Link to={`/pass-events/${passEvent.id}`} key={passEvent.id}>
                <PassEventCard item={passEvent} />
              </Link>
            ))}
          </div>
          <div className="pagination-center">
            <ReactPaginate
              className="pagination"
              pageCount={data.pageCount}
              previousLabel="<"
              nextLabel=">"
              forcePage={currentPage - 1} // Keep pagination in sync (0-based)
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
      {data && data.items.length === 0 && <p>No pass events found.</p>}
      {!currentGroundStationId && (
        <h2>Please select a ground station to view pass events.</h2>
      )}
    </div>
  );
}
