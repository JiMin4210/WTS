import { useEffect, useMemo, useRef, useState } from "react";
import { callAppSync } from "../appsync";
import { Q_DAILY, Q_MONTHLY, Q_YEARLY } from "../queries";
import type { Point, Tab } from "../types";

/**
 * 탭/기간별 시계열 데이터를 로딩하는 훅.
 * - selectedDeviceId 또는 탭/날짜가 바뀌면 해당 Query를 1회 호출
 * - reqId로 "느린 응답이 최신 상태를 덮는 문제" 방지
 */

type Args =
  | { deviceId: string; date: string }
  | { deviceId: string; yearMonth: string }
  | { deviceId: string; year: string };

export function useSeries(params: {
  selectedDeviceId: string | null;
  tab: Tab;
  dayDate: string;
  monthYearMonth: string;
  year: string;
}) {
  const { selectedDeviceId, tab, dayDate, monthYearMonth, year } = params;

  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeArgs: Args | null = useMemo(() => {
    if (!selectedDeviceId) return null;

    if (tab === "day") return { deviceId: selectedDeviceId, date: dayDate };
    if (tab === "month")
      return { deviceId: selectedDeviceId, yearMonth: monthYearMonth };
    return { deviceId: selectedDeviceId, year };
  }, [selectedDeviceId, tab, dayDate, monthYearMonth, year]);

  const reqId = useRef(0);

  useEffect(() => {
    if (!activeArgs) {
      setPoints([]);
      return;
    }

    const current = ++reqId.current;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        if (tab === "day") {
          const data = await callAppSync<{ getDailySeries: Point[] }>(Q_DAILY, {
            deviceId: activeArgs.deviceId,
            date: (activeArgs as any).date,
          });
          if (reqId.current === current) setPoints(data.getDailySeries);
        } else if (tab === "month") {
          const data = await callAppSync<{ getMonthlySeries: Point[] }>(
            Q_MONTHLY,
            {
              deviceId: activeArgs.deviceId,
              yearMonth: (activeArgs as any).yearMonth,
            }
          );
          if (reqId.current === current) setPoints(data.getMonthlySeries);
        } else {
          const data = await callAppSync<{ getYearlySeries: Point[] }>(
            Q_YEARLY,
            {
              deviceId: activeArgs.deviceId,
              year: (activeArgs as any).year,
            }
          );
          if (reqId.current === current) setPoints(data.getYearlySeries);
        }
      } catch (e: any) {
        if (reqId.current === current) {
          setError(String(e?.message ?? e));
          setPoints([]);
        }
      } finally {
        if (reqId.current === current) setLoading(false);
      }
    })();
  }, [activeArgs, tab]);

  return { points, loading, error, setError };
}
