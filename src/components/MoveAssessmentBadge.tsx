import { observer } from "mobx-react-lite";
import type { MoveAssessment } from "../models/PlayModel";

export type MoveAssessmentBadgeProps = {
  assessment: MoveAssessment | null;
};

type BadgeConfig = {
  symbol: string;
  label: string;
  className: string;
};

const BADGE_CONFIG: Record<MoveAssessment, BadgeConfig> = {
  book: {
    symbol: "\u2713",
    label: "Book move",
    className: "badge-book",
  },
  playable: {
    symbol: "~",
    label: "Playable",
    className: "badge-playable",
  },
  inaccuracy: {
    symbol: "\u2717",
    label: "Inaccuracy",
    className: "badge-inaccuracy",
  },
};

export const MoveAssessmentBadge = observer(function MoveAssessmentBadge(
  props: MoveAssessmentBadgeProps,
) {
  const { assessment } = props;

  if (!assessment) {
    return null;
  }

  const config = BADGE_CONFIG[assessment];

  return (
    <div
      className={`move-assessment-badge ${config.className}`}
      data-testid="move-assessment-badge"
    >
      <span className="badge-symbol">{config.symbol}</span>
      <span className="badge-label">{config.label}</span>
    </div>
  );
});
