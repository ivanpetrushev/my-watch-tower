import PassFilters from "./PassFilters";
import SatelliteFilters from "./SatelliteFilters";

export default function FilterContainer({
  satelliteFilters,
  passFilters,
}: {
  satelliteFilters?: boolean;
  passFilters?: boolean;
}) {
  return (
    <div className="filter-container">
      {satelliteFilters && <SatelliteFilters />}
      {passFilters && <PassFilters />}
      {/* <div className="filter-actions">
        <button>Apply filters</button>
        <button>Clear</button>
        <button>Save preset</button>
      </div> */}
    </div>
  );
}
