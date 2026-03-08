import { useNavigate } from "react-router-dom";

function SettingsScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="settings-screen" data-testid="settings-screen">
      <div className="screen-header">
        <button
          className="back-button"
          data-testid="back-button"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          &#8592;
        </button>
        <h2 className="screen-header-title">Settings</h2>
      </div>
      <div className="settings-content">
        <p>Settings will appear here.</p>
      </div>
    </div>
  );
}

export default SettingsScreen;
