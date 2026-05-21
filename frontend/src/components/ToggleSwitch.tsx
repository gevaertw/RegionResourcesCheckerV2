interface ToggleSwitchProps {
  active: boolean;
  onToggle: () => void;
  label: string;
}

export default function ToggleSwitch({
  active,
  onToggle,
  label,
}: ToggleSwitchProps) {
  return (
    <div
      className={`toggle-switch ${active ? "active" : ""}`}
      onClick={onToggle}
      role="switch"
      aria-checked={active}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="toggle-track" />
      <span className="toggle-label">{label}</span>
    </div>
  );
}
