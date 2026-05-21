import { useState, useEffect, useMemo, useCallback } from "react";
import type { VmRegionData, VmFamily, VmSubtype } from "../types";
import VmTree from "../components/VmTree";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function collectAllVmPaths(families: VmFamily[]): Set<string> {
  const paths = new Set<string>();
  for (const fam of families) {
    if (fam.subtypes.length > 0) {
      paths.add(fam.name);
      for (const st of fam.subtypes) {
        paths.add(`${fam.name}/${st.name}`);
      }
    }
  }
  return paths;
}

function findVmMatchingPaths(
  families: VmFamily[],
  query: string
): { expandPaths: Set<string>; matchCount: number } {
  const expandPaths = new Set<string>();
  let matchCount = 0;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return { expandPaths, matchCount: 0 };

  for (const fam of families) {
    const famPath = fam.name;
    if (terms.every((t) => fam.name.toLowerCase().includes(t))) {
      matchCount++;
      expandPaths.add(famPath);
    }
    for (const st of fam.subtypes) {
      const stPath = `${famPath}/${st.name}`;
      const stDisplay = `${fam.name}/${st.name}`;
      if (terms.every((t) => stDisplay.toLowerCase().includes(t))) {
        matchCount++;
        expandPaths.add(famPath);
        expandPaths.add(stPath);
      }
      for (const size of st.sizes) {
        const sizeDisplay = `${stDisplay}/${size.name}`;
        if (terms.every((t) => sizeDisplay.toLowerCase().includes(t))) {
          matchCount++;
          expandPaths.add(famPath);
          expandPaths.add(stPath);
        }
      }
    }
  }

  return { expandPaths, matchCount };
}

interface VmPageProps {
  selectedRegion: string;
  searchQuery: string;
  debouncedQuery: string;
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
  onFamilyCount: (count: number) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string | null) => void;
}

export default function VmPage({
  selectedRegion,
  searchQuery,
  debouncedQuery,
  searchFilterActive,
  setSearchFilterActive,
  onMatchCount,
  onExpandControls,
  onTimestamp,
  onFamilyCount,
  onLoading,
  onError,
}: VmPageProps) {
  const [vmData, setVmData] = useState<VmRegionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedRegion) {
      setVmData(null);
      onTimestamp(null);
      onFamilyCount(0);
      return;
    }
    setLoading(true);
    onLoading(true);
    setError(null);
    onError(null);
    setVmData(null);
    setExpandedPaths(new Set());

    fetch(`${API_BASE}/api/vm/${encodeURIComponent(selectedRegion)}`)
      .then((res) => {
        if (!res.ok) throw new Error("VM data not available yet");
        return res.json();
      })
      .then((data: VmRegionData) => {
        setVmData(data);
        onTimestamp(data.timestamp);
        // Default: expand 1 level (families)
        const level0 = new Set<string>();
        for (const fam of data.families) {
          if (fam.subtypes.length > 0) level0.add(fam.name);
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
    if (!vmData || !debouncedQuery.trim())
      return { searchExpanded: new Set<string>(), matchCount: 0 };
    const result = findVmMatchingPaths(vmData.families, debouncedQuery.trim());
    return { searchExpanded: result.expandPaths, matchCount: result.matchCount };
  }, [debouncedQuery, vmData]);

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
    if (!vmData) return;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      // Level 0: families, Level 1: subtypes
      const allByDepth: string[][] = [[], []];
      for (const fam of vmData.families) {
        if (fam.subtypes.length > 0) {
          allByDepth[0].push(fam.name);
          for (const st of fam.subtypes) {
            allByDepth[1].push(`${fam.name}/${st.name}`);
          }
        }
      }
      for (const paths of allByDepth) {
        if (!paths.every((p) => next.has(p))) {
          paths.forEach((p) => next.add(p));
          return next;
        }
      }
      return next;
    });
  }, [vmData]);

  const expandAll = useCallback(() => {
    if (!vmData) return;
    setExpandedPaths(collectAllVmPaths(vmData.families));
  }, [vmData]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const collapseOneLevel = useCallback(() => {
    if (!vmData) return;
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      const allByDepth: string[][] = [[], []];
      for (const fam of vmData.families) {
        if (fam.subtypes.length > 0) {
          allByDepth[0].push(fam.name);
          for (const st of fam.subtypes) {
            allByDepth[1].push(`${fam.name}/${st.name}`);
          }
        }
      }
      for (let d = allByDepth.length - 1; d >= 0; d--) {
        const paths = allByDepth[d];
        if (paths.some((p) => next.has(p))) {
          paths.forEach((p) => next.delete(p));
          return next;
        }
      }
      return next;
    });
  }, [vmData]);

  useEffect(() => {
    onExpandControls({ expandOneLevel, expandAll, collapseOneLevel, collapseAll });
  }, [expandOneLevel, expandAll, collapseOneLevel, collapseAll]);

  useEffect(() => {
    if (vmData) {
      onFamilyCount(vmData.families.length);
    }
  }, [vmData]);

  const hasActiveSearch = debouncedQuery.trim().length > 0;
  const noResults = hasActiveSearch && matchCount === 0 && vmData !== null;

  return (
    <>
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <div>Loading VM data…</div>
        </div>
      )}
      {error && <div className="error-msg">{error}</div>}
      {!loading && !error && !selectedRegion && (
        <div className="empty-state">Select a region to view VM sizes.</div>
      )}
      {!loading && !error && vmData && noResults && (
        <div className="empty-state">
          No results found for &ldquo;{debouncedQuery.trim()}&rdquo;
        </div>
      )}
      {!loading && !error && vmData && !noResults && (
        <VmTree
          families={vmData.families}
          isExpanded={isExpanded}
          onTogglePath={togglePath}
          searchQuery={debouncedQuery}
          searchFilterActive={searchFilterActive}
          matchedPaths={searchExpanded}
        />
      )}
    </>
  );
}
