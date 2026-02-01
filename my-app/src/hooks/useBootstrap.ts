// src/hooks/useBootstrap.ts
import { useEffect, useRef, useState } from "react";
import { callAppSync } from "../appsync";
import { Q_ME, Q_LIST_MY_DEVICES, REMOVE_DEVICE } from "../queries";
import type { DeviceSummary } from "../types";

/**
 * 앱 최초 부팅 시:
 * 1) me(sub) 가져오기
 * 2) 내 디바이스 목록 가져오기
 * 3) 첫 디바이스 자동 선택(있다면)
 *
 * StrictMode 개발환경에서 useEffect가 2번 도는 현상 방지:
 * - ranOnce 가드로 네트워크 호출 1회만 실행
 */
export function useBootstrap() {
  const [me, setMe] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ranOnce = useRef(false);

  function safeSetError(e: any) {
    setError(String(e?.message ?? e));
  }

  /**
   * ✅ 디바이스 목록 새로고침
   * - 등록/삭제 후 호출
   * - 선택된 디바이스가 사라졌으면 첫 디바이스로 자동 선택
   */
  async function refreshDevices() {
    const dataList = await callAppSync<{ listMyDevices: DeviceSummary[] }>(Q_LIST_MY_DEVICES);
    const next = dataList.listMyDevices ?? [];
    setDevices(next);

    // ✅ 선택값은 "함수형 업데이트"로 꼬임 방지
    setSelectedDeviceId((prev) => {
      if (prev && next.some((d) => d.deviceId === prev)) return prev;
      return next.length ? next[0].deviceId : null;
    });
  }

  /**
   * ✅ 디바이스 삭제
   * - 내 userId 파티션에서만 삭제됨(DynamoDB PK=userId 기반)
   * - 삭제 후 목록 갱신
   */
  async function removeDevice(deviceId: string) {
    await callAppSync<{ removeDevice: boolean }>(REMOVE_DEVICE, { deviceId });
    await refreshDevices();
  }

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    (async () => {
      try {
        setError(null);

        const dataMe = await callAppSync<{ me: string }>(Q_ME);
        setMe(dataMe.me);

        await refreshDevices();
      } catch (e: any) {
        safeSetError(e);
        setMe(null);
        setDevices([]);
        setSelectedDeviceId(null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    me,
    isLoggedIn: me !== null,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    error,
    setError,

    // ✅ 추가 exports
    refreshDevices,
    removeDevice,
  };
}
