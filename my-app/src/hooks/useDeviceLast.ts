// src/hooks/useDeviceLast.ts
import { useEffect, useRef, useState } from "react";
import { callAppSync } from "../appsync";
import { Q_GET_DEVICE_LAST } from "../queries";
import type { DeviceLast } from "../types";

/**
 * ✅ B버전(비용 최소):
 * - 선택된 디바이스 1대만 device_last를 조회해서 온라인/오프라인 표시
 * - 디바이스 선택이 바뀔 때만 요청 (필요시 수동 새로고침 가능)
 */
export function useDeviceLast(selectedDeviceId: string | null) {
  const [last, setLast] = useState<DeviceLast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 늦게 도착한 응답이 최신 상태를 덮어쓰는 현상 방지
  const reqId = useRef(0);

  async function refresh() {
    if (!selectedDeviceId) {
      setLast(null);
      setError(null);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);

    try {
      const data = await callAppSync<{ getDeviceLast: DeviceLast }>(
        Q_GET_DEVICE_LAST,
        { deviceId: selectedDeviceId }
      );
      if (id !== reqId.current) return;
      setLast(data.getDeviceLast ?? null);
    } catch (e: any) {
      if (id !== reqId.current) return;
      setError(String(e?.message ?? e));
      setLast(null);
    } finally {
      if (id !== reqId.current) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    // 선택된 디바이스가 바뀌면 1번만 조회
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  return { last, loading, error, refresh };
}
