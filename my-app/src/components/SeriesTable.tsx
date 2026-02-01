import type { Point } from "../types";

export function SeriesTable(props: { points: Point[] }) {
  if (props.points.length === 0) {
    return (
      <div style={{ color: "#666" }}>
        데이터가 없거나 아직 디바이스/탭이 선택되지 않았습니다.
      </div>
    );
  }

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        border: "1px solid #ddd",
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
            x
          </th>
          <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
            y
          </th>
        </tr>
      </thead>
      <tbody>
        {props.points.map((p, idx) => (
          <tr key={idx}>
            <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{p.x}</td>
            <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{p.y}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
