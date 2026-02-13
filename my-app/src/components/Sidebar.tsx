import { useEffect, useState } from "react";
import "./Sidebar.css";
import type { DeviceSummary } from "../types";
import { DeviceRegisterModal } from "./DeviceRegisterModal";

function IconTrash() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <path d="M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10 11v7M14 11v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 14h10l1-14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const NARROW_PX = 900;

export function Sidebar(props: {
  open: boolean;
  devices: DeviceSummary[];
  selectedDeviceId: string | null;

  onSelectDevice: (deviceId: string) => void;
  onRemoveDevice: (deviceId: string) => void;

  onRegistered: (newDeviceId?: string) => Promise<void> | void;

  // ✅ 드로어(모바일) 닫기
  onClose?: () => void;
}) {
  const [regOpen, setRegOpen] = useState(false);

  // ESC로 닫기(모바일/드로어용)
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  const closeIfNarrow = () => {
    if (typeof window !== "undefined" && window.innerWidth <= NARROW_PX) {
      props.onClose?.();
    }
  };

  return (
    <>
      {/* 모바일 드로어 오버레이 */}
      <div
        className={`sbOverlay ${props.open ? "sbOverlay--open" : ""}`}
        onClick={() => props.onClose?.()}
        aria-hidden={!props.open}
      />

      <aside className={`sb ${props.open ? "sb--open" : "sb--closed"}`} aria-hidden={!props.open}>
        <div className="sb__header">
          <div className="sb__title">디바이스</div>
        </div>

        <div className="sb__listWrap">
          <ul className="sb__ul">
            {/* 등록 카드 */}
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
                    <div className="sb__sub">새 기기를 추가합니다</div>
                  </div>
                </div>
              </button>
            </li>

            {/* 디바이스 리스트 */}
            {props.devices.map((d) => {
              const active = d.deviceId === props.selectedDeviceId;

              return (
                <li key={d.deviceId}>
                  <button
                    type="button"
                    className={`sb__card ${active ? "sb__card--active" : ""}`}
                    onClick={() => {
                      props.onSelectDevice(d.deviceId);
                      closeIfNarrow();
                    }}
                  >
                    <div className="sb__row">
                      <div className="sb__cardMain">
                        <div className="sb__nick">{d.nickname}</div>
                        {/* 개발자용: DEV_로 시작할 때만 id 표시 */}
                        {import.meta.env.DEV ? (
                          <div className="sb__id">{d.deviceId}</div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        className="sb__trash"
                        title="디바이스 삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onRemoveDevice(d.deviceId);
                        }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}

            {props.devices.length === 0 ? (
              <li className="sb__empty">등록된 디바이스가 없습니다.</li>
            ) : null}
          </ul>
        </div>

        {/* 등록 모달 */}
        <DeviceRegisterModal
          open={regOpen}
          onClose={() => setRegOpen(false)}
          onRegistered={async (newDeviceId) => {
            await props.onRegistered(newDeviceId);
            setRegOpen(false);
            // ✅ 등록 완료 후에는 사이드바를 닫지 않음(사용자 요청)
          }}
        />
      </aside>
    </>
  );
}
