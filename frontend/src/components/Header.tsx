import ToggleSwitch from "./ToggleSwitch";

interface HeaderProps {
  regions: string[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showAvailableOnly: boolean;
  onToggleAvailable: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export default function Header({
  regions,
  selectedRegion,
  onRegionChange,
  searchQuery,
  onSearchChange,
  showAvailableOnly,
  onToggleAvailable,
  onExpandAll,
  onCollapseAll,
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
          <input
            type="text"
            placeholder="Search resource providers…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <ToggleSwitch
          active={showAvailableOnly}
          onToggle={onToggleAvailable}
          label="Available only"
        />
        <div className="btn-group">
          <button className="btn" onClick={onExpandAll}>
            Expand All
          </button>
          <button className="btn" onClick={onCollapseAll}>
            Collapse All
          </button>
        </div>
      </div>
    </header>
  );
}
