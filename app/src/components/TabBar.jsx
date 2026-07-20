const TABS = [
  ["today", "Today", "🌤️"],
  ["plan", "Plan", "🗺️"],
  ["convert", "Convert", "💱"],
  ["spend", "Spend", "🧾"],
  ["stay", "Stay", "🏨"],
];

export default function TabBar({ tab, setTab }) {
  return (
    <nav className="tabbar">
      <div className="tabbar-inner">
        {TABS.map(([id, label, ico]) => (
          <button
            key={id}
            className={"tab" + (tab === id ? " on" : "")}
            onClick={() => setTab(id)}
            aria-label={label}
          >
            <span className="ico">{ico}</span>
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
