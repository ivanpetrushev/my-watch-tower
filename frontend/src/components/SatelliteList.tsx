import ReactPaginate from "react-paginate";
import { useGetSatellites } from "../api/generated/satellites/satellites";
import { useState } from "react";
import SatelliteCard from "./SatelliteCard";
import "@/styles/SatelliteList.scss";
import FilterContainer from "./FilterContainer";
import { useFilterStore } from "../stores/filtersStore";

export default function SatelliteList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { satelliteFilters } = useFilterStore();
  const { data, error } = useGetSatellites({
    page: currentPage.toString(),
    ...satelliteFilters,
    frequencyFilters: satelliteFilters.frequencyFilters
      ? JSON.stringify(satelliteFilters.frequencyFilters)
      : undefined,
  });

  const handlePageChange = (selectedItem: { selected: number }) => {
    // ReactPaginate uses 0-based indexing, but our API uses 1-based
    setCurrentPage(selectedItem.selected + 1);
  };

  return (
    <div>
      <h2>Satellites</h2>
      <FilterContainer showSatelliteFilters={true} showPresetOptions={true} />
      {/* {isLoading && <p>Loading satellites...</p>} */}
      {error && <p>Error loading satellites: {String(error)}</p>}
      {data && data.items.length > 0 && (
        <>
          <div className="satellite-list">
            {data.items.map((satellite) => (
              <SatelliteCard key={satellite.id} item={satellite} />
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
      {data && data.items.length === 0 && <p>No satellites found.</p>}
    </div>
  );
}
