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
): { expandPaths: Set<string>; matchCount: number } {
  const expandPaths = new Set<string>();
  let matchCount = 0;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return { expandPaths, matchCount: 0 };

  function walk(
    children: ResourceNode[],
    treePath: string,
    displayPath: string
  ) {
    for (const child of children) {
      const childTreePath = `${treePath}/${child.name}`;
      const childDisplayPath = `${displayPath}/${child.name}`;

      if (
        terms.every((term) => childDisplayPath.toLowerCase().includes(term))
      ) {
        matchCount++;
        const segments = childTreePath.split("/");
        let p = segments[0];
        expandPaths.add(p);
        for (let i = 1; i < segments.length; i++) {
          p += `/${segments[i]}`;
          expandPaths.add(p);
        }
      }
      walk(child.children, childTreePath, childDisplayPath);
    }
  }

  for (const prov of providers) {
    if (terms.every((term) => prov.name.toLowerCase().includes(term))) {
      matchCount++;
      expandPaths.add(prov.name);
    }
    walk(prov.children, prov.name, prov.name);
  }

  return { expandPaths, matchCount };
}

export default function App() {
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [searchFilterActive, setSearchFilterActive] = useState(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    setSearchFilterActive(false);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
    setDebouncedQuery("");
    setSearchFilterActive(false);

    fetch(`${API_BASE}/api/regions/${encodeURIComponent(selectedRegion)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Region data not available yet");
        return res.json();
      })
      .then((data: RegionData) => {
        setRegionData(data);
        // Default view: expand 1 level (provider names)
        const level0 = new Set<string>();
        for (const prov of data.providers) {
          if (prov.children.length > 0) level0.add(prov.name);
        }
        setExpandedPaths(level0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedRegion]);

  const { searchExpanded, matchCount } = useMemo(() => {
    if (!regionData || !debouncedQuery.trim())
      return { searchExpanded: new Set<string>(), matchCount: 0 };
    const result = findMatchingPaths(
      regionData.providers,
      debouncedQuery.trim()
    );
    return { searchExpanded: result.expandPaths, matchCount: result.matchCount };
  }, [debouncedQuery, regionData]);

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

  const expandOneLevel = useCallback(() => {
    if (!regionData) return;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      const allByDepth: string[][] = [];
      function walk(children: ResourceNode[], parent: string, depth: number) {
        for (const child of children) {
          const p = `${parent}/${child.name}`;
          if (child.children.length > 0) {
            if (!allByDepth[depth]) allByDepth[depth] = [];
            allByDepth[depth].push(p);
            walk(child.children, p, depth + 1);
          }
        }
      }
      for (const prov of regionData.providers) {
        if (prov.children.length > 0) {
          if (!allByDepth[0]) allByDepth[0] = [];
          allByDepth[0].push(prov.name);
          walk(prov.children, prov.name, 1);
        }
      }
      for (const paths of allByDepth) {
        if (!paths) continue;
        if (!paths.every((p) => next.has(p))) {
          paths.forEach((p) => next.add(p));
          return next;
        }
      }
      return next;
    });
  }, [regionData]);

  const expandAll = useCallback(() => {
    if (!regionData) return;
    setExpandedPaths(collectAllPaths(regionData.providers));
  }, [regionData]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const collapseOneLevel = useCallback(() => {
    if (!regionData) return;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      const allByDepth: string[][] = [];
      function walk(children: ResourceNode[], parent: string, depth: number) {
        for (const child of children) {
          const p = `${parent}/${child.name}`;
          if (child.children.length > 0) {
            if (!allByDepth[depth]) allByDepth[depth] = [];
            allByDepth[depth].push(p);
            walk(child.children, p, depth + 1);
          }
        }
      }
      for (const prov of regionData.providers) {
        if (prov.children.length > 0) {
          if (!allByDepth[0]) allByDepth[0] = [];
          allByDepth[0].push(prov.name);
          walk(prov.children, prov.name, 1);
        }
      }
      // Find deepest expanded depth and collapse it
      for (let d = allByDepth.length - 1; d >= 0; d--) {
        const paths = allByDepth[d];
        if (!paths) continue;
        if (paths.some((p) => next.has(p))) {
          paths.forEach((p) => next.delete(p));
          return next;
        }
      }
      return next;
    });
  }, [regionData]);

  const visibleProviders = useMemo(() => {
    if (!regionData) return [];
    let providers = regionData.providers;
    if (showAvailableOnly) {
      providers = providers.filter(providerHasAvailable);
    }
    return providers;
  }, [regionData, showAvailableOnly]);

  const hasActiveSearch = debouncedQuery.trim().length > 0;
  const noResults = hasActiveSearch && matchCount === 0 && regionData !== null;

  return (
    <div className="app-container">
      <Header
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionChange={setSelectedRegion}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showAvailableOnly={showAvailableOnly}
        onToggleAvailable={() => setShowAvailableOnly((v) => !v)}
        onExpandOneLevel={expandOneLevel}
        onExpandAll={expandAll}
        onCollapseOneLevel={collapseOneLevel}
        onCollapseAll={collapseAll}
        matchCount={matchCount}
        hasActiveSearch={hasActiveSearch}
        searchFilterActive={searchFilterActive}
        onToggleSearchFilter={() => setSearchFilterActive((v) => !v)}
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
      {!loading && !error && regionData && noResults && (
        <div className="empty-state">
          No results found for &ldquo;{debouncedQuery.trim()}&rdquo;
        </div>
      )}
      {!loading && !error && regionData && !noResults && (
        <ResourceTree
          providers={visibleProviders}
          isExpanded={isExpanded}
          onTogglePath={togglePath}
          showAvailableOnly={showAvailableOnly}
          searchQuery={debouncedQuery}
          searchFilterActive={searchFilterActive}
          matchedPaths={searchExpanded}
        />
      )}
      <footer className="app-footer">
        <div>Vibecoded with ❤️ and GitHub Copilot</div>
        <div className="footer-note">This app only shows regional services. Global services like Front Door are not shown.</div>
      </footer>
    </div>
  );
}
