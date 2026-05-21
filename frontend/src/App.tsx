import { useState, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import type { PageId } from "./components/Header";
import ResourcesPage from "./pages/ResourcesPage";
import VmPage from "./pages/VmPage";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function App() {
  const [regions, setRegions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [activePage, setActivePage] = useState<PageId>("resources");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  const [searchFilterActive, setSearchFilterActive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expandControlsRef = useRef({
    expandOneLevel: () => {},
    expandAll: () => {},
    collapseOneLevel: () => {},
    collapseAll: () => {},
  });

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

  // Reset search when switching pages
  const handlePageChange = useCallback((page: PageId) => {
    setActivePage(page);
    setSearchQuery("");
    setDebouncedQuery("");
    setSearchFilterActive(false);
    setMatchCount(0);
    setTimestamp(null);
    setItemCount(0);
  }, []);

  const handleExpandControls = useCallback(
    (controls: {
      expandOneLevel: () => void;
      expandAll: () => void;
      collapseOneLevel: () => void;
      collapseAll: () => void;
    }) => {
      expandControlsRef.current = controls;
    },
    []
  );

  const hasActiveSearch = debouncedQuery.trim().length > 0;

  const statusLabel = activePage === "resources" ? "provider" : "famil";
  const statusSuffix =
    activePage === "resources"
      ? itemCount !== 1
        ? "s"
        : ""
      : itemCount !== 1
        ? "ies"
        : "y";

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
        onExpandOneLevel={() => expandControlsRef.current.expandOneLevel()}
        onExpandAll={() => expandControlsRef.current.expandAll()}
        onCollapseOneLevel={() => expandControlsRef.current.collapseOneLevel()}
        onCollapseAll={() => expandControlsRef.current.collapseAll()}
        matchCount={matchCount}
        hasActiveSearch={hasActiveSearch}
        searchFilterActive={searchFilterActive}
        onToggleSearchFilter={() => setSearchFilterActive((v) => !v)}
        activePage={activePage}
        onPageChange={handlePageChange}
        showToggle={activePage === "resources"}
      />
      {timestamp && !loading && !error && (
        <div className="status-bar">
          Last updated: {new Date(timestamp).toLocaleString()} &mdash;{" "}
          {itemCount} {statusLabel}{statusSuffix}
        </div>
      )}
      {activePage === "resources" && (
        <ResourcesPage
          selectedRegion={selectedRegion}
          searchQuery={searchQuery}
          debouncedQuery={debouncedQuery}
          showAvailableOnly={showAvailableOnly}
          searchFilterActive={searchFilterActive}
          setSearchFilterActive={setSearchFilterActive}
          onMatchCount={setMatchCount}
          onExpandControls={handleExpandControls}
          onTimestamp={setTimestamp}
          onProviderCount={setItemCount}
          onLoading={setLoading}
          onError={setError}
        />
      )}
      {activePage === "vms" && (
        <VmPage
          selectedRegion={selectedRegion}
          searchQuery={searchQuery}
          debouncedQuery={debouncedQuery}
          searchFilterActive={searchFilterActive}
          setSearchFilterActive={setSearchFilterActive}
          onMatchCount={setMatchCount}
          onExpandControls={handleExpandControls}
          onTimestamp={setTimestamp}
          onFamilyCount={setItemCount}
          onLoading={setLoading}
          onError={setError}
        />
      )}
      <footer className="app-footer">
        <div>Vibecoded with ❤️ and GitHub Copilot</div>
        <div className="footer-note">This app only shows regional services. Global services like Front Door are not shown.</div>
      </footer>
    </div>
  );
}
