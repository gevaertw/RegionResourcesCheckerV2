import { useState, useEffect, useMemo, useCallback } from "react";
import type { RegionData, ProviderNode, ResourceNode } from "../types";
import ResourceTree from "../components/ResourceTree";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const FILTERED_NAMES = new Set(["operations", "locations", "usages"]);

function filterTree(children: ResourceNode[]): ResourceNode[] {
  return children
    .filter((c) => !FILTERED_NAMES.has(c.name))
    .map((c) => ({ ...c, children: filterTree(c.children) }));
}

function filterProviders(providers: ProviderNode[]): ProviderNode[] {
  return providers.map((p) => ({ ...p, children: filterTree(p.children) }));
}

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

interface ResourcesPageProps {
  selectedRegion: string;
  searchQuery: string;
  debouncedQuery: string;
  showAvailableOnly: boolean;
  searchFilterActive: boolean;
  setSearchFilterActive: (v: boolean) => void;
  onMatchCount: (count: number) => void;
  onExpandControls: (controls: {
    expandOneLevel: () => void;
    expandAll: () => void;
    collapseOneLevel: () => void;
    collapseAll: () => void;
  }) => void;
  onTimestamp: (ts: string | null) => void;
  onProviderCount: (count: number) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
}

export default function ResourcesPage({
  selectedRegion,
  searchQuery,
  debouncedQuery,
  showAvailableOnly,
  searchFilterActive,
  setSearchFilterActive,
  onMatchCount,
  onExpandControls,
  onTimestamp,
  onProviderCount,
  onLoading,
  onError,
}: ResourcesPageProps) {
  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedRegion) {
      setRegionData(null);
      onTimestamp(null);
      onProviderCount(0);
      return;
    }
    setLoading(true);
    onLoading(true);
    setError(null);
    onError(null);
    setRegionData(null);
    setExpandedPaths(new Set());

    fetch(`${API_BASE}/api/regions/${encodeURIComponent(selectedRegion)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Region data not available yet");
        return res.json();
      })
      .then((data: RegionData) => {
        setRegionData(data);
        onTimestamp(data.timestamp);
        const level0 = new Set<string>();
        for (const prov of data.providers) {
          if (prov.children.length > 0) level0.add(prov.name);
        }
        setExpandedPaths(level0);
        setLoading(false);
        onLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        onError(err.message);
        setLoading(false);
        onLoading(false);
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

  useEffect(() => {
    onMatchCount(matchCount);
  }, [matchCount]);

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

  useEffect(() => {
    onExpandControls({ expandOneLevel, expandAll, collapseOneLevel, collapseAll });
  }, [expandOneLevel, expandAll, collapseOneLevel, collapseAll]);

  const visibleProviders = useMemo(() => {
    if (!regionData) return [];
    let providers = filterProviders(regionData.providers);
    if (showAvailableOnly) {
      providers = providers.filter(providerHasAvailable);
    }
    return providers;
  }, [regionData, showAvailableOnly]);

  useEffect(() => {
    onProviderCount(visibleProviders.length);
  }, [visibleProviders.length]);

  const hasActiveSearch = debouncedQuery.trim().length > 0;
  const noResults = hasActiveSearch && matchCount === 0 && regionData !== null;

  return (
    <>
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
    </>
  );
}
