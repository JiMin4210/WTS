import type { Tab } from "../types";

export function Tabs(props: { tab: Tab; onChange: (t: Tab) => void }) {
  const btnStyle = (active: boolean) => ({
    padding: "8px 12px",
    borderRadius: 8,
    border: active ? "2px solid #333" : "1px solid #ccc",
    background: active ? "#f2f2f2" : "white",
  });

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <button
        onClick={() => props.onChange("day")}
        style={btnStyle(props.tab === "day")}
      >
        일
      </button>
      <button
        onClick={() => props.onChange("month")}
        style={btnStyle(props.tab === "month")}
      >
        월
      </button>
      <button
        onClick={() => props.onChange("year")}
        style={btnStyle(props.tab === "year")}
      >
        연
      </button>
    </div>
  );
}
