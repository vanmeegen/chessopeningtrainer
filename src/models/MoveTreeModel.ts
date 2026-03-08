import { action, computed, makeObservable, observable } from "mobx";
import type { Annotation, MoveNode } from "../types/OpeningTypes";

/** Internal tree node with parent reference for navigation */
type MoveTreeNode = {
  move: string;
  fen: string;
  annotation?: Annotation;
  children: MoveTreeNode[];
  parent: MoveTreeNode | null;
  isMainLine: boolean;
};

/** Branch info returned by getBranches() */
export type BranchInfo = {
  move: string;
  fen: string;
  isMainLine: boolean;
};

/**
 * MobX observable model for navigating an opening move tree.
 * Built from a MoveNode (from OpeningTypes) and supports
 * forward/backward navigation and branch selection.
 */
export class MoveTreeModel {
  private root: MoveTreeNode;
  private _currentNode: MoveTreeNode;

  constructor(moveNode: MoveNode) {
    this.root = MoveTreeModel.buildTree(moveNode, null);
    this._currentNode = this.root;
    makeObservable<MoveTreeModel, "_currentNode">(this, {
      _currentNode: observable.ref,
      currentMove: computed,
      currentFen: computed,
      isAtStart: computed,
      isAtEnd: computed,
      currentAnnotation: computed,
      advance: action,
      goBack: action,
      goToStart: action,
      goToEnd: action,
    });
  }

  /** Recursively build the internal tree from external MoveNode data */
  private static buildTree(
    node: MoveNode,
    parent: MoveTreeNode | null,
  ): MoveTreeNode {
    const treeNode: MoveTreeNode = {
      move: node.move,
      fen: node.fen,
      annotation: node.annotation,
      children: [],
      parent,
      isMainLine: node.isMainLine,
    };

    treeNode.children = node.children.map((child) =>
      MoveTreeModel.buildTree(child, treeNode),
    );

    return treeNode;
  }

  /** The SAN of the current move */
  get currentMove(): string {
    return this._currentNode.move;
  }

  /** The FEN at the current position */
  get currentFen(): string {
    return this._currentNode.fen;
  }

  /** Whether we are at the root/start of the tree */
  get isAtStart(): boolean {
    return this._currentNode === this.root;
  }

  /** Whether the current node is a leaf (no children) */
  get isAtEnd(): boolean {
    return this._currentNode.children.length === 0;
  }

  /** The annotation for the current node, if any */
  get currentAnnotation(): Annotation | undefined {
    return this._currentNode.annotation;
  }

  /**
   * Advance to the next node.
   * If `move` is provided, advance to the child with that SAN.
   * Otherwise, follow the main line child.
   */
  advance(move?: string): void {
    if (this._currentNode.children.length === 0) {
      return;
    }

    if (move !== undefined) {
      const target = this._currentNode.children.find(
        (child) => child.move === move,
      );
      if (target) {
        this._currentNode = target;
      }
      return;
    }

    // Follow main line: find the first child marked as main line
    const mainLineChild = this._currentNode.children.find(
      (child) => child.isMainLine,
    );
    if (mainLineChild) {
      this._currentNode = mainLineChild;
    } else if (this._currentNode.children.length > 0) {
      // Fallback: if no child is marked as main line, take the first child
      this._currentNode = this._currentNode.children[0]!;
    }
  }

  /** Go back to the parent node. Does nothing if at root. */
  goBack(): void {
    if (this._currentNode.parent !== null) {
      this._currentNode = this._currentNode.parent;
    }
  }

  /** Go back to the root of the tree */
  goToStart(): void {
    this._currentNode = this.root;
  }

  /** Advance to the end of the main line */
  goToEnd(): void {
    while (this._currentNode.children.length > 0) {
      const mainLineChild = this._currentNode.children.find(
        (child) => child.isMainLine,
      );
      if (mainLineChild) {
        this._currentNode = mainLineChild;
      } else {
        this._currentNode = this._currentNode.children[0]!;
      }
    }
  }

  /** Get available continuations (branches) at the current node */
  getBranches(): BranchInfo[] {
    return this._currentNode.children.map((child) => ({
      move: child.move,
      fen: child.fen,
      isMainLine: child.isMainLine,
    }));
  }

  /** Get the complete main line as an array of SAN strings */
  getMainLine(): string[] {
    const moves: string[] = [];
    let node: MoveTreeNode | undefined = this.root;

    while (node) {
      moves.push(node.move);
      const mainChild: MoveTreeNode | undefined = node.children.find(
        (c) => c.isMainLine,
      );
      const next: MoveTreeNode | undefined = mainChild ?? node.children[0];
      if (!next) break;
      node = next;
    }

    return moves;
  }
}
