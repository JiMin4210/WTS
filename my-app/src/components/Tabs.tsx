import "./Tabs.css";
import type { Tab } from "../types";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "day", label: "일" },
  { key: "month", label: "월" },
  { key: "year", label: "연" },
];

export function Tabs(props: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="segWrap" role="tablist" aria-label="기간 선택">
      {TABS.map((t) => {
        const active = props.tab === t.key;
        return (
          <button
            key={t.key}
            className={`segBtn ${active ? "isActive" : ""}`}
            onClick={() => props.onChange(t.key)}
            role="tab"
            aria-selected={active}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
