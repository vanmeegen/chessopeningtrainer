import { useNavigate } from "react-router-dom";

type ModeCardConfig = {
  testId: string;
  title: string;
  description: string;
  path: string;
};

const modeCards: ModeCardConfig[] = [
  {
    testId: "learn-card",
    title: "Learn",
    description: "Explore openings with guided explanations",
    path: "/select/learn",
  },
  {
    testId: "memorize-card",
    title: "Memorize",
    description: "Test and strengthen your opening memory",
    path: "/select/memorize",
  },
  {
    testId: "play-card",
    title: "Play",
    description: "Play openings freely with commentary",
    path: "/select/play",
  },
];

function HomeScreen(): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <div className="home-screen" data-testid="home-screen">
      <div className="home-header">
        <h1 className="home-title">Chess Opening Trainer</h1>
        <button
          className="settings-button"
          data-testid="settings-button"
          onClick={() => navigate("/settings")}
          aria-label="Settings"
        >
          &#9881;
        </button>
      </div>
      <div className="mode-cards">
        {modeCards.map((card) => (
          <div
            key={card.testId}
            className="mode-card"
            data-testid={card.testId}
            onClick={() => navigate(card.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate(card.path);
              }
            }}
          >
            <div className="mode-card-title">{card.title}</div>
            <div className="mode-card-description">{card.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HomeScreen;
