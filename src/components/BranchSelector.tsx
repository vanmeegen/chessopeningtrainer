import { CSSProperties } from "react";
import { observer } from "mobx-react-lite";
import type { BranchInfo } from "../models/MoveTreeModel";

export type BranchSelectorProps = {
  branches: BranchInfo[];
  onSelectBranch: (move: string) => void;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  padding: "8px",
  borderRadius: "6px",
  backgroundColor: "#f0f4f8",
  border: "1px solid #d0d8e0",
};

const branchButtonStyle: CSSProperties = {
  padding: "4px 10px",
  fontSize: "14px",
  cursor: "pointer",
  border: "1px solid #b0b8c0",
  borderRadius: "4px",
  backgroundColor: "#fff",
  fontFamily: "monospace",
};

const mainLineBranchStyle: CSSProperties = {
  ...branchButtonStyle,
  fontWeight: "bold",
  borderColor: "#4caf50",
};

export const BranchSelector = observer(function BranchSelector({
  branches,
  onSelectBranch,
}: BranchSelectorProps) {
  return (
    <div data-testid="branch-selector" style={containerStyle}>
      {branches.map((branch) => (
        <button
          key={branch.move}
          data-testid="branch-option"
          style={branch.isMainLine ? mainLineBranchStyle : branchButtonStyle}
          onClick={() => onSelectBranch(branch.move)}
        >
          {branch.move}
        </button>
      ))}
    </div>
  );
});
