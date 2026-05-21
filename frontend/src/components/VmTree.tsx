import { useState, useCallback } from "react";
import type { VmFamily, VmSubtype, VmSize } from "../types";

interface VmTreeProps {
  families: VmFamily[];
  isExpanded: (path: string) => boolean;
  onTogglePath: (path: string) => void;
  searchQuery: string;
  searchFilterActive: boolean;
  matchedPaths: Set<string>;
}

const KEY_CAPABILITIES = [
  "vCPUs",
  "MemoryGB",
  "MaxDataDiskCount",
  "PremiumIO",
  "AcceleratedNetworkingEnabled",
];

function formatCapValue(name: string, value: string): string {
  if (name === "PremiumIO" || name === "AcceleratedNetworkingEnabled") {
    return value === "True" ? "Yes" : "No";
  }
  return value;
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

function VmSizeRow({
  size,
  searchQuery,
}: {
  size: VmSize;
  searchQuery: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const zones = size.zones.length > 0 ? size.zones.join(", ") : "—";
  const keyCaps = size.capabilities.filter((c) =>
    KEY_CAPABILITIES.includes(c.name)
  );
  const otherCaps = size.capabilities.filter(
    (c) => !KEY_CAPABILITIES.includes(c.name)
  );

  return (
    <tr className="vm-row">
      <td className="vm-cell vm-cell-name">
        {highlightText(size.name, searchQuery)}
      </td>
      <td className="vm-cell vm-cell-zones">{zones}</td>
      <td className="vm-cell vm-cell-capabilities">
        <span className="vm-capabilities">
          {keyCaps.map((c, i) => (
            <span key={c.name} className="vm-cap-item">
              {c.name}: {formatCapValue(c.name, c.value)}
              {i < keyCaps.length - 1 ? ", " : ""}
            </span>
          ))}
        </span>
        {otherCaps.length > 0 && (
          <>
            <button
              className="vm-cap-toggle"
              onClick={(e) => {
                e.stopPropagation();
                setShowAll((v) => !v);
              }}
            >
              {showAll
                ? "Hide details"
                : `+${otherCaps.length} more`}
            </button>
            {showAll && (
              <div className="vm-cap-details">
                {otherCaps.map((c) => (
                  <span key={c.name} className="vm-cap-detail-item">
                    {c.name}: {c.value}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </td>
    </tr>
  );
}

function VmSubtypeNode({
  subtype,
  path,
  isExpanded,
  onTogglePath,
  searchQuery,
  searchFilterActive,
  matchedPaths,
}: {
  subtype: VmSubtype;
  path: string;
  isExpanded: (path: string) => boolean;
  onTogglePath: (path: string) => void;
  searchQuery: string;
  searchFilterActive: boolean;
  matchedPaths: Set<string>;
}) {
  const expanded = isExpanded(path);
  const isLeaf = subtype.sizes.length === 0;

  const visibleSizes = searchFilterActive
    ? subtype.sizes.filter((s) => matchedPaths.has(`${path}/${s.name}`))
    : subtype.sizes;

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
        <span className="tree-node-name">
          {highlightText(subtype.name, searchQuery)}
          <span className="vm-size-count"> ({subtype.sizes.length} sizes)</span>
        </span>
      </div>
      {expanded && !isLeaf && visibleSizes.length > 0 && (
        <div className="tree-children">
          <table className="vm-table">
            <thead>
              <tr>
                <th className="vm-th">Name</th>
                <th className="vm-th">Zones</th>
                <th className="vm-th">Capabilities</th>
              </tr>
            </thead>
            <tbody>
              {visibleSizes.map((size) => (
                <VmSizeRow
                  key={size.name}
                  size={size}
                  searchQuery={searchQuery}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VmTree({
  families,
  isExpanded,
  onTogglePath,
  searchQuery,
  searchFilterActive,
  matchedPaths,
}: VmTreeProps) {
  if (families.length === 0) {
    return <div className="empty-state">No VM families to display.</div>;
  }

  const filteredFamilies = searchFilterActive
    ? families.filter((f) => matchedPaths.has(f.name))
    : families;

  return (
    <div className="tree-container">
      {filteredFamilies.map((family) => {
        const path = family.name;
        const expanded = isExpanded(path);
        const isLeaf = family.subtypes.length === 0;

        const visibleSubtypes = searchFilterActive
          ? family.subtypes.filter((st) =>
              matchedPaths.has(`${path}/${st.name}`)
            )
          : family.subtypes;

        return (
          <div key={family.name}>
            <div
              className="tree-node-header"
              onClick={() => !isLeaf && onTogglePath(path)}
            >
              <span
                className={`tree-chevron ${expanded ? "expanded" : ""} ${isLeaf ? "leaf" : ""}`}
              >
                ▸
              </span>
              <span className="tree-node-name">
                {highlightText(family.name, searchQuery)}
              </span>
            </div>
            {expanded && !isLeaf && (
              <div className="tree-children">
                {visibleSubtypes.map((subtype) => (
                  <VmSubtypeNode
                    key={subtype.name}
                    subtype={subtype}
                    path={`${path}/${subtype.name}`}
                    isExpanded={isExpanded}
                    onTogglePath={onTogglePath}
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
