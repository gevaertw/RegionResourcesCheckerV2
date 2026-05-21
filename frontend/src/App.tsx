import { useState, useEffect, useMemo, useCallback } from "react";
import type { RegionData, ProviderNode, ResourceNode } from "./types";
import Header from "./components/Header";
import ResourceTree from "./components/ResourceTree";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function hasAvailableDescendant(node: ResourceNode): boolean {
  if (node.available) return true;
  return node.children.some(hasAvailableDescendant);
}

function providerHasAvailable(provider: ProviderNode): boolean {
  return provider.children.some(hasAvailableDescendant);
}

function collectAllPaths(providers: ProviderNode[]): Set<string> {
  const paths = new Set<string>();
  function walk(children: ResourceNode[], parent: string) {
    for (const child of children) {
      const p = `${parent}/${child.name}`;
      if (child.children.length > 0) {
        paths.add(p);
        walk(child.children, p);
      }
    }
  }
  for (const prov of providers) {
    if (prov.children.length > 0) {
      paths.add(prov.name);
      walk(prov.children, prov.name);
    }
  }
  return paths;
}

function findMatchingPaths(
  providers: ProviderNode[],
  query: string
): Set<string> {
  const matched = new Set<string>();
  const q = query.toLowerCase();

  function walk(children: ResourceNode[], parentPath: string) {
    for (const child of children) {
      const childPath = `${parentPath}/${child.name}`;
      if (child.name.toLowerCase().includes(q)) {
        const segments = childPath.split("/");
        let path = segments[0];
        matched.add(path);
        for (let i = 1; i < segments.length; i++) {
          path += `/${segments[i]}`;
          matched.add(path);
        }
      }
      walk(child.children, childPath);
    }
  }

  for (const prov of providers) {
    if (prov.name.toLowerCase().includes(q)) {
      matched.add(prov.name);
    }
    walk(prov.children, prov.name);
  }
  return matched;
}

export default function App() {
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${API_BASE}/api/regions`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load regions");
        return res.json();
      })
      .then((data: string[]) => setRegions(data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedRegion) return;
    setLoading(true);
    setError(null);
    setRegionData(null);
    setExpandedPaths(new Set());
    setSearchQuery("");

    fetch(`${API_BASE}/api/regions/${encodeURIComponent(selectedRegion)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Region data not available yet");
        return res.json();
      })
      .then((data: RegionData) => {
        setRegionData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedRegion]);

  const searchExpanded = useMemo(() => {
    if (!regionData || !searchQuery.trim()) return new Set<string>();
    return findMatchingPaths(regionData.providers, searchQuery.trim());
  }, [searchQuery, regionData]);

  const isExpanded = useCallback(
    (path: string) => expandedPaths.has(path) || searchExpanded.has(path),
    [expandedPaths, searchExpanded]
  );

  const togglePath = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!regionData) return;
    setExpandedPaths(collectAllPaths(regionData.providers));
  }, [regionData]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const visibleProviders = useMemo(() => {
    if (!regionData) return [];
    let providers = regionData.providers;
    if (showAvailableOnly) {
      providers = providers.filter(providerHasAvailable);
    }
    return providers;
  }, [regionData, showAvailableOnly]);

  return (
    <>
      <Header
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showAvailableOnly={showAvailableOnly}
        onToggleAvailable={() => setShowAvailableOnly((v) => !v)}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
      {regionData && (
        <div className="status-bar">
          Last updated:{" "}
          {new Date(regionData.timestamp).toLocaleString()} &mdash;{" "}
          {visibleProviders.length} provider
          {visibleProviders.length !== 1 ? "s" : ""}
        </div>
      )}
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <div>Loading region data…</div>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
      {!loading && !error && !selectedRegion && (
        <div className="empty-state">Select a region to view resource providers.</div>
      )}
      {!loading && !error && regionData && (
        <ResourceTree
          providers={visibleProviders}
          isExpanded={isExpanded}
          onTogglePath={togglePath}
          showAvailableOnly={showAvailableOnly}
          searchQuery={searchQuery}
        />
      )}
    </>
  );
}
