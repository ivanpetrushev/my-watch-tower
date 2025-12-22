import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@/styles/reset.css";
import "@/styles/App.scss";
import Layout from "./components/Layout";
import StationsList from "./components/StationsList";
import StationEditor from "./components/StationEditor";
import PassEvents from "./components/PassEvents";
import SatelliteList from "./components/SatelliteList";
import PassDetails from "./components/PassDetails";
import Timeline from "./components/Timeline";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<PassEvents />} />
          <Route path="/stations" element={<StationsList />} />
          <Route
            path="/stations/new"
            element={<StationEditor mode="create" />}
          />
          <Route
            path="/stations/:id/edit"
            element={<StationEditor mode="edit" />}
          />
          <Route path="/satellite-list" element={<SatelliteList />} />
          <Route path="/pass-events/:id" element={<PassDetails />} />
          <Route path="/timeline" element={<Timeline />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
