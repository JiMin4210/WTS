import { useState } from "react";
import "./Sidebar.css";
import type { DeviceSummary } from "../types";
import { DeviceRegisterModal } from "./DeviceRegisterModal";

export function Sidebar(props: {
  open: boolean;
  devices: DeviceSummary[];
  selectedDeviceId: string | null;

  onSelectDevice: (deviceId: string) => void;
  onRemoveDevice: (deviceId: string) => void;

  // ✅ 등록 성공 후, 목록 갱신 + (가능하면) 새 디바이스 자동 선택까지 하려고 씀
  onRegistered: (newDeviceId?: string) => Promise<void> | void;
}) {
  const [regOpen, setRegOpen] = useState(false);

  if (!props.open) return null;

  return (
    <aside className="sb">
      <div className="sb__header">
        <div className="sb__title">디바이스</div>
      </div>

      <div className="sb__listWrap">
        <ul className="sb__ul">
          {/* ✅ 등록 카드: 최상단 */}
          <li>
            <button
              type="button"
              className="sb__card sb__card--create"
              onClick={() => setRegOpen(true)}
            >
              <div className="sb__createRow">
                <span className="sb__plus" aria-hidden="true">
                  +
                </span>
                <div className="sb__createText">
                  <div className="sb__nick">디바이스 등록</div>
                  <div className="sb__id">새 기기를 추가합니다</div>
                </div>
              </div>
            </button>
          </li>

          {/* ✅ 디바이스 리스트 */}
          {props.devices.map((d) => {
            const active = d.deviceId === props.selectedDeviceId;

            return (
              <li key={d.deviceId}>
                <button
                  type="button"
                  className={`sb__card ${active ? "sb__card--active" : ""}`}
                  onClick={() => props.onSelectDevice(d.deviceId)}
                >
                  <div className="sb__nick">{d.nickname}</div>
                  {import.meta.env.DEV && <div className="sb__id">{d.deviceId}</div>}

                  {/* ✅ 삭제 버튼 */}
                  <div className="sb__action">
                    <button
                      className="sb__trashBtn"
                      type="button"
                      aria-label="삭제"
                      title="삭제"
                      onClick={(e) => {
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
            등록된 디바이스가 없습니다. 상단의 “디바이스 등록”을 눌러 추가해 주세요.
          </div>
        )}
      </div>

      {/* ✅ 등록 모달 */}
      <DeviceRegisterModal
        open={regOpen}
        onClose={() => setRegOpen(false)}
        onRegistered={async (newId) => {
          await props.onRegistered(newId);
          setRegOpen(false);
        }}
      />
    </aside>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 9v11h10V9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 12v6M14 12v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
