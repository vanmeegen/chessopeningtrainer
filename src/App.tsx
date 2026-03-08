import { Routes, Route } from "react-router-dom";
import HomeScreen from "./components/HomeScreen";
import OpeningSelectionScreen from "./components/OpeningSelectionScreen";
import TrainingScreen from "./components/TrainingScreen";
import SettingsScreen from "./components/SettingsScreen";
import "./App.css";

function App(): React.JSX.Element {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/select/:mode" element={<OpeningSelectionScreen />} />
        <Route path="/train/:mode/:openingId" element={<TrainingScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </div>
  );
}

export default App;
