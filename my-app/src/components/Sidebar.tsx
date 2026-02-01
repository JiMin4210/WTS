import type { DeviceSummary } from "../types";

export function Sidebar(props: {
  open: boolean;
  devices: DeviceSummary[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
}) {
  if (!props.open) return null;

  return (
    <div
      style={{
        width: 280,
        borderRight: "1px solid #ddd",
        padding: 12,
        overflowY: "auto",
      }}
    >
      <b>디바이스</b>

      <ul style={{ paddingLeft: 16 }}>
        {props.devices.map((d) => (
          <li key={d.deviceId} style={{ marginTop: 8 }}>
            <button
              onClick={() => props.onSelectDevice(d.deviceId)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: 8,
                borderRadius: 8,
                border:
                  d.deviceId === props.selectedDeviceId
                    ? "2px solid #333"
                    : "1px solid #ccc",
                background:
                  d.deviceId === props.selectedDeviceId ? "#f2f2f2" : "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: 600 }}>{d.nickname}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{d.deviceId}</div>
            </button>
          </li>
        ))}
      </ul>

      {props.devices.length === 0 && (
        <div style={{ marginTop: 12, color: "#555" }}>
          디바이스가 없습니다. user_devices 매핑을 확인해줘.
        </div>
      )}
    </div>
  );
}
