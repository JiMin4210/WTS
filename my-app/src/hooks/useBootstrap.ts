import { useEffect, useRef, useState } from "react";
import { callAppSync } from "../appsync";
import { Q_ME, Q_LIST_MY_DEVICES } from "../queries";
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

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    (async () => {
      try {
        setError(null);

        const dataMe = await callAppSync<{ me: string }>(Q_ME);
        setMe(dataMe.me);

        const dataList = await callAppSync<{ listMyDevices: DeviceSummary[] }>(
          Q_LIST_MY_DEVICES
        );
        setDevices(dataList.listMyDevices);

        if (dataList.listMyDevices.length > 0) {
          setSelectedDeviceId(dataList.listMyDevices[0].deviceId);
        } else {
          setSelectedDeviceId(null);
        }
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setMe(null);
        setDevices([]);
        setSelectedDeviceId(null);
      }
    })();
  }, []);

  return {
    me,
    isLoggedIn: me !== null,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    error,
    setError,
  };
}
