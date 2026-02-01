import { useEffect, useMemo, useRef, useState } from "react";
import { signInWithRedirect, signOut } from "aws-amplify/auth";
import { callAppSync } from "./appsync";
import {
  Q_ME,
  Q_LIST_MY_DEVICES,
  Q_DAILY,
  Q_MONTHLY,
  Q_YEARLY,
} from "./queries";

type DeviceSummary = { deviceId: string; nickname: string };
type Point = { x: string; y: number };

// 탭 타입을 문자열 리터럴로 제한 (오타 방지)
type Tab = "day" | "month" | "year";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// "YYYY-MM-DD"
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// "YYYY-MM"
function formatYearMonth(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export default function App() {
  // ----------------------------
  // 1) 인증/기본 데이터 상태
  // ----------------------------
  const [me, setMe] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 사이드바 표시/숨김
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ----------------------------
  // 2) UI 선택 상태 (네 요구사항 핵심)
  // ----------------------------
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("day");

  // "일" 화면에서 날짜 이동을 위해 선택된 날짜를 state로 둔다
  const [dayDate, setDayDate] = useState<string>(formatDate(new Date()));

  // "월" 화면: 현재 선택된 월(YYYY-MM)
  const [monthYearMonth, setMonthYearMonth] = useState<string>(
    formatYearMonth(new Date())
  );

  // "연" 화면: 현재 선택된 연도(YYYY)
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));

  // ----------------------------
  // 3) 탭 데이터 결과
  // ----------------------------
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);

  // StrictMode 중복 실행 방지 (너가 이미 적용한 것)
  const ranOnce = useRef(false);

  // ----------------------------
  // 4) 앱 시작 시: me + devices 불러오기
  // ----------------------------
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

        // ✅ 최초 디바이스 자동 선택
        // - 사용성: 로그인 후 바로 데이터가 보이면 좋음
        // - 비용: 여기서 선택되면 바로 "현재 탭 데이터"만 1번 호출될 거야(아래 useEffect)
        if (dataList.listMyDevices.length > 0) {
          setSelectedDeviceId(dataList.listMyDevices[0].deviceId);
        }
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setMe(null);
        setDevices([]);
        setSelectedDeviceId(null);
        setPoints([]);
      }
    })();
  }, []);

  // ----------------------------
  // 5) “현재 탭에서 필요한 변수값”을 계산
  // ----------------------------
  // useMemo는 “계산 결과를 캐싱”해서 불필요한 재계산을 줄여줌.
  // (초보 단계에서는 없어도 되지만, 상태가 많아질수록 깔끔해져)
  const activeArgs = useMemo(() => {
    if (!selectedDeviceId) return null;

    if (tab === "day") {
      return { deviceId: selectedDeviceId, date: dayDate };
    }
    if (tab === "month") {
      return { deviceId: selectedDeviceId, yearMonth: monthYearMonth };
    }
    return { deviceId: selectedDeviceId, year };
  }, [selectedDeviceId, tab, dayDate, monthYearMonth, year]);

  // ----------------------------
  // 6) “디바이스 선택/탭/날짜”가 바뀌면 -> 해당 Query 1번 호출
  // ----------------------------
  useEffect(() => {
    if (!activeArgs) return;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        // 탭마다 호출하는 Query가 다르다
        if (tab === "day") {
          const data = await callAppSync<{ getDailySeries: Point[] }>(Q_DAILY, {
            deviceId: activeArgs.deviceId,
            date: (activeArgs as any).date,
          });
          setPoints(data.getDailySeries);
        } else if (tab === "month") {
          const data = await callAppSync<{ getMonthlySeries: Point[] }>(
            Q_MONTHLY,
            {
              deviceId: activeArgs.deviceId,
              yearMonth: (activeArgs as any).yearMonth,
            }
          );
          setPoints(data.getMonthlySeries);
        } else {
          const data = await callAppSync<{ getYearlySeries: Point[] }>(
            Q_YEARLY,
            {
              deviceId: activeArgs.deviceId,
              year: (activeArgs as any).year,
            }
          );
          setPoints(data.getYearlySeries);
        }
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setPoints([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeArgs, tab]);

  // ----------------------------
  // 7) 날짜 이동(일 탭)
  // ----------------------------
  function moveDay(delta: number) {
    // delta가 -1이면 어제, +1이면 내일
    const d = new Date(dayDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDayDate(formatDate(d));
  }

  // ----------------------------
  // 8) 월 이동(월 탭)
  // ----------------------------
  function moveMonth(delta: number) {
    const d = new Date(monthYearMonth + "-01T00:00:00");
    d.setMonth(d.getMonth() + delta);
    setMonthYearMonth(formatYearMonth(d));
  }

  // ----------------------------
  // 9) 연도 이동(연 탭)
  // ----------------------------
  function moveYear(delta: number) {
    const y = Number(year) + delta;
    setYear(String(y));
  }

  // ----------------------------
  // UI 렌더링 시작
  // ----------------------------
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* 좌측 사이드바 */}
      {sidebarOpen && (
        <div
          style={{
            width: 280,
            borderRight: "1px solid #ddd",
            padding: 12,
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>디바이스</b>
            <button onClick={() => setSidebarOpen(false)}>숨기기</button>
          </div>

          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
            (실제 화면에서는 deviceId는 숨기고 닉네임만 보여줄 예정)
          </div>

          <ul style={{ paddingLeft: 16 }}>
            {devices.map((d) => (
              <li key={d.deviceId} style={{ marginTop: 8 }}>
                <button
                  onClick={() => setSelectedDeviceId(d.deviceId)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 8,
                    borderRadius: 8,
                    border:
                      d.deviceId === selectedDeviceId
                        ? "2px solid #333"
                        : "1px solid #ccc",
                    background:
                      d.deviceId === selectedDeviceId ? "#f2f2f2" : "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{d.nickname}</div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    {d.deviceId}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {devices.length === 0 && (
            <div style={{ marginTop: 12, color: "#555" }}>
              디바이스가 없습니다. user_devices 매핑을 확인해줘.
            </div>
          )}
        </div>
      )}

      {/* 우측 메인 */}
      <div style={{ flex: 1, padding: 16 }}>
        {/* 상단 바 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)}>☰</button>
          )}

          <button onClick={() => signInWithRedirect()}>로그인</button>
          <button onClick={() => signOut({ global: true })}>로그아웃</button>

          <div style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>
            me(sub): {me ?? "(로그인 필요)"}
          </div>
        </div>

        {/* 탭 */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => setTab("day")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: tab === "day" ? "2px solid #333" : "1px solid #ccc",
              background: tab === "day" ? "#f2f2f2" : "white",
            }}
          >
            일
          </button>
          <button
            onClick={() => setTab("month")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: tab === "month" ? "2px solid #333" : "1px solid #ccc",
              background: tab === "month" ? "#f2f2f2" : "white",
            }}
          >
            월
          </button>
          <button
            onClick={() => setTab("year")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: tab === "year" ? "2px solid #333" : "1px solid #ccc",
              background: tab === "year" ? "#f2f2f2" : "white",
            }}
          >
            연
          </button>
        </div>

        {/* 탭별 컨트롤 */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          {!selectedDeviceId ? (
            <div>좌측에서 디바이스를 선택해줘.</div>
          ) : (
            <>
              {tab === "day" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => moveDay(-1)}>◀</button>
                  <b>{dayDate}</b>
                  <button onClick={() => moveDay(+1)}>▶</button>
                </div>
              )}

              {tab === "month" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => moveMonth(-1)}>◀</button>
                  <b>{monthYearMonth}</b>
                  <button onClick={() => moveMonth(+1)}>▶</button>
                </div>
              )}

              {tab === "year" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => moveYear(-1)}>◀</button>
                  <b>{year}</b>
                  <button onClick={() => moveYear(+1)}>▶</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* 로딩/에러 */}
        {loading && <div style={{ marginTop: 12 }}>로딩 중...</div>}
        {error && (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              marginTop: 12,
              background: "#111",
              color: "#fff",
              padding: 12,
              borderRadius: 8,
            }}
          >
            {error}
          </pre>
        )}

        {/* 결과 표시 (차트 대신 리스트) */}
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>데이터(임시 리스트)</h3>

          {/* 그래프 대신, x/y 목록으로 확인 */}
          {points.length === 0 ? (
            <div style={{ color: "#666" }}>
              데이터가 없거나(빈 배열), 아직 디바이스/탭이 선택되지 않았습니다.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                border: "1px solid #ddd",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                    x
                  </th>
                  <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                    y
                  </th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{p.x}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{p.y}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 개발 중 편의: 현재 상태 디버그 */}
        <div style={{ marginTop: 16, color: "#777", fontSize: 12 }}>
          selectedDeviceId: {selectedDeviceId ?? "(none)"} / tab: {tab}
        </div>
      </div>
    </div>
  );
}
