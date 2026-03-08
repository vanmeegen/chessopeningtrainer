import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { observer } from "mobx-react-lite";
import HomeScreen from "./components/HomeScreen";
import OpeningSelectionScreen from "./components/OpeningSelectionScreen";
import TrainingScreen from "./components/TrainingScreen";
import SettingsScreen from "./components/SettingsScreen";
import UpdateNotification from "./components/UpdateNotification";
import { settingsModel } from "./models/SettingsModel";
import "./App.css";

const App = observer(function App(): React.JSX.Element {
  const theme = settingsModel.effectiveTheme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="app">
      <UpdateNotification />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/select/:mode" element={<OpeningSelectionScreen />} />
        <Route path="/train/:mode/:openingId" element={<TrainingScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </div>
  );
});

export default App;
