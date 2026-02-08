// src/components/Sidebar.tsx
import "./Sidebar.css";
import type { DeviceSummary } from "../types";
import { DeviceRegisterForm } from "./DeviceRegisterForm";

export function Sidebar(props: {
  open: boolean;
  devices: DeviceSummary[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onRemoveDevice: (deviceId: string) => void;
  onRegistered: () => Promise<void> | void;
}) {
  if (!props.open) return null;

  return (
    <aside className="sb">
      <div className="sb__header">
        <div className="sb__title">디바이스</div>
      </div>

      <div className="sb__listWrap">
        <ul className="sb__ul">
          {props.devices.map((d) => {
            const active = d.deviceId === props.selectedDeviceId;

            return (
              <li key={d.deviceId}>
                <button
                  className={`sb__card ${active ? "sb__card--active" : ""}`}
                  onClick={() => props.onSelectDevice(d.deviceId)}
                  type="button"
                >
                  <div className="sb__nick">{d.nickname}</div>
                  <div className="sb__id">{d.deviceId}</div>

                  <div className="sb__action">
                    <button
                      className="sb__trashBtn"
                      type="button"
                      title="삭제"
                      aria-label="삭제"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const ok = window.confirm("이 디바이스를 삭제하시겠습니까?");
                        if (!ok) return;

                        props.onRemoveDevice(d.deviceId);
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {props.devices.length === 0 && (
          <div className="sb__empty">
            디바이스가 없습니다. user_devices 매핑을 확인해주세요.
          </div>
        )}
      </div>

      <div className="sb__register">
        <div className="sb__registerTitle">디바이스 등록</div>
        <DeviceRegisterForm onRegistered={props.onRegistered} />
      </div>
    </aside>
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
