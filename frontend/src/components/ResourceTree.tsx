import type { ProviderNode, ResourceNode } from "../types";
import TreeNode from "./TreeNode";

interface ResourceTreeProps {
  providers: ProviderNode[];
  isExpanded: (path: string) => boolean;
  onTogglePath: (path: string) => void;
  showAvailableOnly: boolean;
  searchQuery: string;
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

export default function ResourceTree({
  providers,
  isExpanded,
  onTogglePath,
  showAvailableOnly,
  searchQuery,
}: ResourceTreeProps) {
  if (providers.length === 0) {
    return <div className="empty-state">No resource providers to display.</div>;
  }

  return (
    <div className="tree-container">
      {providers.map((provider) => {
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
              <span
                className={`provider-badge ${provider.registrationState === "Registered" ? "registered" : "not-registered"}`}
              >
                {provider.registrationState}
              </span>
            </div>
            {expanded && !isLeaf && (
              <div className="tree-children">
                {provider.children
                  .filter(
                    (child) =>
                      !showAvailableOnly || hasAvailableDescendant(child)
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
