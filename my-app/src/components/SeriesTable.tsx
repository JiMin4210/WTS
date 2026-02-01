// src/components/Sidebar.tsx
import "./Sidebar.css";
import type { DeviceSummary } from "../types";
import { DeviceRegisterForm } from "./DeviceRegisterForm";

export function Sidebar(props: {
  open: boolean;
  devices: DeviceSummary[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;

  // ✅ 추가
  onRemoveDevice: (deviceId: string) => void;
  onRegistered: () => Promise<void> | void;
}) {
  if (!props.open) return null;

  return (
    <div className="sb">
      <div className="sb__title">디바이스</div>

      {/* ✅ 리스트만 스크롤 */}
      <div className="sb__listWrap">
        <ul className="sb__ul">
          {props.devices.map((d) => {
            const active = d.deviceId === props.selectedDeviceId;

            return (
              <li key={d.deviceId} className="sb__li">
                <button
                  onClick={() => props.onSelectDevice(d.deviceId)}
                  className={`sb__deviceBtn ${active ? "sb__deviceBtn--active" : ""}`}
                >
                  <div className="sb__nick">{d.nickname}</div>
                  <div className="sb__id">{d.deviceId}</div>

                  {/* ✅ hover에만 보이는 삭제 */}
                  <span className="sb__trashWrap">
                    <button
                      className="sb__trashBtn"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        props.onRemoveDevice(d.deviceId);
                      }}
                      title="삭제"
                      aria-label="삭제"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {props.devices.length === 0 && (
          <div style={{ marginTop: 12, color: "#555" }}>
            디바이스가 없습니다. user_devices 매핑을 확인해줘.
          </div>
        )}
      </div>

      {/* ✅ 최하단 등록 */}
      <div className="sb__register">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>디바이스 등록</div>
        <DeviceRegisterForm onRegistered={props.onRegistered} />
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-8 4h10m-9 0 1 14h6l1-14M10 11v7m4-7v7"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
