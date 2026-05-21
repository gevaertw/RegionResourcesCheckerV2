import type { ResourceNode } from "../types";

interface TreeNodeProps {
  node: ResourceNode;
  path: string;
  isExpanded: (path: string) => boolean;
  onTogglePath: (path: string) => void;
  showAvailableOnly: boolean;
  searchQuery: string;
  searchFilterActive: boolean;
  matchedPaths: Set<string>;
}

function hasAvailableDescendant(node: ResourceNode): boolean {
  if (node.available) return true;
  return node.children.some(hasAvailableDescendant);
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  const escaped = terms.map((t) =>
    t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);
  if (parts.length <= 1) return text;

  const matchPattern = new RegExp(`^(?:${escaped.join("|")})$`, "i");
  return (
    <>
      {parts.map((part, i) =>
        matchPattern.test(part) ? (
          <span key={i} className="highlight">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function TreeNode({
  node,
  path,
  isExpanded,
  onTogglePath,
  showAvailableOnly,
  searchQuery,
  searchFilterActive,
  matchedPaths,
}: TreeNodeProps) {
  const expanded = isExpanded(path);
  const isLeaf = node.children.length === 0;

  let visibleChildren = showAvailableOnly
    ? node.children.filter(hasAvailableDescendant)
    : node.children;

  if (searchFilterActive) {
    visibleChildren = visibleChildren.filter((child) =>
      matchedPaths.has(`${path}/${child.name}`)
    );
  }

  return (
    <div>
      <div
        className="tree-node-header"
        onClick={() => !isLeaf && onTogglePath(path)}
      >
        <span
          className={`tree-chevron ${expanded ? "expanded" : ""} ${isLeaf ? "leaf" : ""}`}
        >
          ▸
        </span>
        <span
          className={`tree-node-name ${!node.available ? "unavailable" : ""}`}
        >
          {highlightText(node.name, searchQuery)}
        </span>
      </div>
      {expanded && !isLeaf && (
        <div className="tree-children">
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.name}
              node={child}
              path={`${path}/${child.name}`}
              isExpanded={isExpanded}
              onTogglePath={onTogglePath}
              showAvailableOnly={showAvailableOnly}
              searchQuery={searchQuery}
              searchFilterActive={searchFilterActive}
              matchedPaths={matchedPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
}
