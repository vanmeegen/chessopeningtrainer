import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function InstallButton(): React.JSX.Element | null {
  const [canInstall, setCanInstall] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event): void => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = (): void => {
      setCanInstall(false);
      deferredPromptRef.current = null;
    };

    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!canInstall) {
    return null;
  }

  const handleInstall = (): void => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    void prompt.prompt();
    void prompt.userChoice.then((result) => {
      if (result.outcome === "accepted") {
        setCanInstall(false);
      }
      deferredPromptRef.current = null;
    });
  };

  return (
    <button
      className="install-button"
      data-testid="install-button"
      onClick={handleInstall}
    >
      Install App
    </button>
  );
}

export default InstallButton;
