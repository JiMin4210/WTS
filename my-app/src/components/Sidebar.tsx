import { useEffect, useMemo, useState } from "react";
import "./Sidebar.css";
import type { DeviceSummary } from "../types";
import { DeviceRegisterModal } from "./DeviceRegisterModal";

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

  const isNarrow = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= NARROW_PX;
  }, []);

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
                    <div className="sb__id">새 기기를 추가합니다</div>
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
                        {d.deviceId?.startsWith("DEV_") ? (
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
                        🗑️
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
            closeIfNarrow();
          }}
        />
      </aside>
    </>
  );
}
