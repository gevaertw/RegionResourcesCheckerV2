import type { ProviderNode, ResourceNode } from "../types";
import TreeNode from "./TreeNode";

interface ResourceTreeProps {
  providers: ProviderNode[];
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

function providerIsAvailable(provider: ProviderNode): boolean {
  return provider.children.some(hasAvailableDescendant);
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

export default function ResourceTree({
  providers,
  isExpanded,
  onTogglePath,
  showAvailableOnly,
  searchQuery,
  searchFilterActive,
  matchedPaths,
}: ResourceTreeProps) {
  if (providers.length === 0) {
    return <div className="empty-state">No resource providers to display.</div>;
  }

  const filteredProviders = searchFilterActive
    ? providers.filter((p) => matchedPaths.has(p.name))
    : providers;

  return (
    <div className="tree-container">
      {filteredProviders.map((provider) => {
        const path = provider.name;
        const expanded = isExpanded(path);
        const isLeaf = provider.children.length === 0;
        const available = providerIsAvailable(provider);

        return (
          <div key={provider.name}>
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
                className={`tree-node-name ${!available ? "unavailable" : ""}`}
              >
                {highlightText(provider.name, searchQuery)}
              </span>
            </div>
            {expanded && !isLeaf && (
              <div className="tree-children">
                {provider.children
                  .filter(
                    (child) =>
                      !showAvailableOnly || hasAvailableDescendant(child)
                  )
                  .filter(
                    (child) =>
                      !searchFilterActive ||
                      matchedPaths.has(`${path}/${child.name}`)
                  )
                  .map((child) => (
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
      })}
    </div>
  );
}
