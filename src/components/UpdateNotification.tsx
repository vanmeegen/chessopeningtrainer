import { useRegisterSW } from "virtual:pwa-register/react";

function UpdateNotification(): React.JSX.Element | null {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  const handleRefresh = (): void => {
    void updateServiceWorker(true);
  };

  return (
    <div className="update-notification" data-testid="update-notification">
      <span>New version available</span>
      <button
        className="update-notification-btn"
        data-testid="update-refresh-button"
        onClick={handleRefresh}
      >
        Refresh
      </button>
    </div>
  );
}

export default UpdateNotification;
