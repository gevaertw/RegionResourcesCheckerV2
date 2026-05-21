import ToggleSwitch from "./ToggleSwitch";

interface HeaderProps {
  regions: string[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showAvailableOnly: boolean;
  onToggleAvailable: () => void;
  onExpandOneLevel: () => void;
  onExpandAll: () => void;
  onCollapseOneLevel: () => void;
  onCollapseAll: () => void;
  matchCount: number;
  hasActiveSearch: boolean;
  searchFilterActive: boolean;
  onToggleSearchFilter: () => void;
}

export default function Header({
  regions,
  selectedRegion,
  onRegionChange,
  searchQuery,
  onSearchChange,
  showAvailableOnly,
  onToggleAvailable,
  onExpandOneLevel,
  onExpandAll,
  onCollapseOneLevel,
  onCollapseAll,
  matchCount,
  hasActiveSearch,
  searchFilterActive,
  onToggleSearchFilter,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="disclaimer">
        ⚠ This is <strong>not</strong> an official Microsoft page. Information
        is provided as-is and may not reflect the latest availability.
      </div>
      <h1 className="app-title">Azure Region Resource Checker</h1>
      <div className="header-controls">
        <div className="region-selector">
          <select
            value={selectedRegion}
            onChange={(e) => onRegionChange(e.target.value)}
          >
            <option value="">— Select region —</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="search-field">
          <div className="search-input-wrapper">
            <span className="search-icon">&#128269;</span>
            <input
              type="text"
              placeholder="Search resource providers…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {hasActiveSearch && (
            <span className="search-count">
              {matchCount === 0
                ? "No matches"
                : `${matchCount} match${matchCount !== 1 ? "es" : ""}`}
            </span>
          )}
          <button
            className={`btn btn-filter${searchFilterActive ? " btn-filter-active" : ""}`}
            onClick={onToggleSearchFilter}
            disabled={!hasActiveSearch || matchCount === 0}
          >
            {searchFilterActive ? "Show All" : "Filter"}
          </button>
        </div>
        <ToggleSwitch
          active={showAvailableOnly}
          onToggle={onToggleAvailable}
          label="Available only"
        />
        <div className="btn-group">
          <button className="btn btn-primary" onClick={onExpandAll}>
            Expand All
          </button>
          <button className="btn btn-outline" onClick={onExpandOneLevel}>
            Expand 1 Level
          </button>
          <button className="btn btn-outline" onClick={onCollapseOneLevel}>
            Collapse 1 Level
          </button>
          <button className="btn btn-outline" onClick={onCollapseAll}>
            Collapse All
          </button>
        </div>
      </div>
    </header>
  );
}
