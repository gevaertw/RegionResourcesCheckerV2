import type { ResourceNode } from "../types";

interface TreeNodeProps {
  node: ResourceNode;
  path: string;
  isExpanded: (path: string) => boolean;
  onTogglePath: (path: string) => void;
  showAvailableOnly: boolean;
  searchQuery: string;
}

function hasAvailableDescendant(node: ResourceNode): boolean {
  if (node.available) return true;
  return node.children.some(hasAvailableDescendant);
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.substring(0, idx)}
      <span className="highlight">
        {text.substring(idx, idx + query.length)}
      </span>
      {text.substring(idx + query.length)}
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
}: TreeNodeProps) {
  const expanded = isExpanded(path);
  const isLeaf = node.children.length === 0;

  const visibleChildren = showAvailableOnly
    ? node.children.filter(hasAvailableDescendant)
    : node.children;

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
