// src/hooks/useSeries.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callAppSync } from "../appsync";
import { Q_DAILY, Q_MONTHLY, Q_YEARLY } from "../queries";
import type { Point, Tab } from "../types";

/**
 * 탭/기간별 시계열 데이터를 로딩하는 훅.
 * - selectedDeviceId 또는 탭/날짜가 바뀌면 해당 Query를 1회 호출
 * - reqId로 "느린 응답이 최신 상태를 덮는 문제" 방지
 * - refresh()로 수동 새로고침도 가능
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

  //최종 요청 데이터(Args)를 생성
  //배열 안에 적힌 값들 중 하나라도 바뀔 때만 새로 계산합니다. 값이 안 변했다면 기존 결과물을 재사용해서 성능을 아낍니다.
  const activeArgs: Args | null = useMemo(() => {
    if (!selectedDeviceId) return null;

    if (tab === "day") return { deviceId: selectedDeviceId, date: dayDate };
    if (tab === "month")
      return { deviceId: selectedDeviceId, yearMonth: monthYearMonth };
    return { deviceId: selectedDeviceId, year };
  }, [selectedDeviceId, tab, dayDate, monthYearMonth, year]);

  //상황: 사용자가 '일' 탭을 눌렀다가 바로 '월' 탭을 광클했다고 가정해 봅시다.
  //문제: '일' 데이터 요청이 뒤늦게 도착해서 현재 보고 있는 '월' 차트를 덮어버릴 수 있습니다(경쟁 상태).
  //해결: 요청을 보낼 때마다 번호표(reqId)를 올립니다. 응답이 왔을 때 "이 번호표가 지금 가장 최신 번호표인가?" 확인해서, 옛날 번호표면 결과를 버립니다.
  const reqId = useRef(0);

  /**
   * ✅ 실제 호출 로직을 함수로 분리
   * - useEffect(자동)와 refresh(수동)에서 동일 로직 재사용
   */
  // 역할: 데이터를 가져오는 로직(fetchSeries)을 함수로 정의합니다.
  // useCallback으로 함수를 만드는 건, 특정 시점에 그 함수 주변의 변수 값들을 사진으로 찍어서 보관하는 것과 같습니다.
  // 하지만 리액트에는 "부모가 바뀌어도, 자식은 너랑 상관없는 부분만 바뀌었으니 넌 가만히 있어!"라고 시키는 기능이 있습니다. 이때 useCallback이 결정적인 역할을 합니다
  const fetchSeries = useCallback(
    async (args: Args) => {
      const current = ++reqId.current;

      try {
        setError(null);
        setLoading(true);

        if (tab === "day") {
          const data = await callAppSync<{ getDailySeries: Point[] }>(Q_DAILY, {
            deviceId: args.deviceId,
            date: (args as any).date,
          });
          if (reqId.current === current) setPoints(data.getDailySeries);
        } else if (tab === "month") {
          const data = await callAppSync<{ getMonthlySeries: Point[] }>(
            Q_MONTHLY,
            {
              deviceId: args.deviceId,
              yearMonth: (args as any).yearMonth,
            }
          );
          if (reqId.current === current) setPoints(data.getMonthlySeries);
        } else {
          const data = await callAppSync<{ getYearlySeries: Point[] }>(
            Q_YEARLY,
            {
              deviceId: args.deviceId,
              year: (args as any).year,
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
    },
    [tab]
  );
  //이 말은 "탭(tab)이 바뀌면 fetchSeries 함수를 새로 만들어라"라는 뜻입니다.
  //만약 tab이 바뀌어서 fetchSeries 함수 자체가 최신 버전으로 업데이트되었다면, 그 새로운 함수를 사용해서 데이터를 다시 받아와라(useEffect 실행)


  /**
   * ✅ 자동 로딩: 디바이스/탭/날짜가 바뀌면 1회 호출
   */
  //역할: "감시자"입니다. activeArgs(장치/탭/날짜 정보)가 바뀌는 순간을 감시하다가, 바뀌면 즉시 서버에서 데이터를 가져오는 fetchSeries를 실행합니다.
  useEffect(() => {
    if (!activeArgs) {
      setPoints([]);
      return;
    }
    fetchSeries(activeArgs);
  }, [activeArgs, fetchSeries]);

  /**
   * ✅ 수동 새로고침: 현재 선택된 디바이스/탭/기간 기준으로 다시 호출
   */
  //"자, 이제부터 refresh라는 이름의 특수 함수를 만들 건데, 이건 메모리에 잘 저장해둬."
  const refresh = useCallback(async () => {
    //만약 지금 선택된 장치나 날짜 정보가 없다면? 아무것도 하지 말고 그냥 종료해." (안전장치)
    if (!activeArgs) return;
    //준비된 정보(activeArgs)를 가지고 서버에 가서 최신 데이터를 가져와(fetchSeries). 다 올 때까지 기다려줄게(await)
    await fetchSeries(activeArgs);
    //"이 함수는 장치/날짜가 바뀌거나(activeArgs), 데이터를 가져오는 방법(fetchSeries)이 바뀔 때만 새 버전으로 교체해줘."
  }, [activeArgs, fetchSeries]);

  return { points, loading, error, setError, refresh };
}
