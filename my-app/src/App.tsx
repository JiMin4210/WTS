// src/App.tsx
import { useEffect, useState } from "react";
import { signInWithRedirect, signOut } from "aws-amplify/auth";

import { useBootstrap } from "./hooks/useBootstrap";
import { useSeries } from "./hooks/useSeries";
import { useDeviceLast } from "./hooks/useDeviceLast";

import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Tabs } from "./components/Tabs";
import { SeriesChart } from "./components/SeriesChart";

import type { Tab } from "./types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatYearMonth(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function formatTime(ms: number) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatDateTime(ms: number) {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd} ${formatTime(ms)}`;
}

/**
 * lastServerTs가 초(10자리)로 들어오는 경우도 대비해서 ms로 정규화
 * - 13자리(ms)면 그대로
 * - 10자리(s)면 *1000
 */
function normalizeEpochMs(ts: number | null): number | null {
  if (!ts || !Number.isFinite(ts)) return null;
  // 1e12(2001년 ms)보다 작으면 초로 간주
  if (ts < 1_000_000_000_000) return ts * 1000;
  return ts;
}

// ✅ 수동 새로고침 모델용 상태 계산
function computeStatus(lastServerTsMs: number | null) {
  if (!lastServerTsMs) return { text: "⚪ 알 수 없음", tone: "unknown" as const };

  const diffMin = (Date.now() - lastServerTsMs) / 1000 / 60;
  if (diffMin > 20) return { text: "🔴 오프라인", tone: "offline" as const };
  if (diffMin > 10) return { text: "🟡 연결 불안정", tone: "warn" as const };
  return { text: "🟢 온라인", tone: "online" as const };
}

export default function App() {
  // 1) 로그인 사용자 + 디바이스 목록
  const bootstrap = useBootstrap();

  // 2) UI 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("day");

  const [dayDate, setDayDate] = useState(formatDate(new Date()));
  const [monthYearMonth, setMonthYearMonth] = useState(formatYearMonth(new Date()));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  // ✅ 선택된 디바이스 last 상태(선택 시 1회 자동 조회)
  const devLast = useDeviceLast(bootstrap.selectedDeviceId);

  // ✅ "상태 확인 시각" (사용자 새로고침 기준)
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);

  // ✅ 선택 시 자동 1회 조회도 "상태 확인 시각"으로 찍고 싶다면:
  // - 선택 변경으로 devLast.loading -> false 되는 시점에 한번 찍음(중복 방지)
  const [autoCheckedFor, setAutoCheckedFor] = useState<string | null>(null);
  useEffect(() => {
    const id = bootstrap.selectedDeviceId;
    if (!id) return;

    // 자동조회 완료 시각을 한 번만 찍기
    if (!devLast.loading && !devLast.error && devLast.last && autoCheckedFor !== id) {
      setLastCheckedAt(Date.now());
      setAutoCheckedFor(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootstrap.selectedDeviceId, devLast.loading, devLast.error, devLast.last]);

  // 3) 시계열 데이터 로딩
  const series = useSeries({
    selectedDeviceId: bootstrap.selectedDeviceId,
    tab,
    dayDate,
    monthYearMonth,
    year,
  });

  // 4) 날짜/월/연 이동
  function moveDay(delta: number) {
    const d = new Date(dayDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDayDate(formatDate(d));
  }
  function moveMonth(delta: number) {
    const d = new Date(monthYearMonth + "-01T00:00:00");
    d.setMonth(d.getMonth() + delta);
    setMonthYearMonth(formatYearMonth(d));
  }
  function moveYear(delta: number) {
    setYear(String(Number(year) + delta));
  }

  async function refreshStatus() {
    await devLast.refresh();
    setLastCheckedAt(Date.now());
  }

  // ✅ 표시용 값 준비
  const lastServerTsMs = normalizeEpochMs(devLast.last?.lastServerTs ?? null);
  const st = computeStatus(lastServerTsMs);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <Sidebar
        open={sidebarOpen}
        devices={bootstrap.devices}
        selectedDeviceId={bootstrap.selectedDeviceId}
        onSelectDevice={(id) => bootstrap.setSelectedDeviceId(id)}
	// ✅ 추가: 삭제 / 등록 후 갱신
        onRemoveDevice={(id) => bootstrap.removeDevice(id)}
        onRegistered={() => bootstrap.refreshDevices()}
      />

      <div style={{ flex: 1, padding: 16 }}>
        <TopBar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          isLoggedIn={bootstrap.isLoggedIn}
          onLogin={() => signInWithRedirect()}
          onLogout={() => signOut({ global: true })}
          me={bootstrap.me}
        />

        <Tabs tab={tab} onChange={setTab} />

        {/* 탭별 컨트롤 */}
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          {!bootstrap.selectedDeviceId ? (
            <div>좌측에서 디바이스를 선택해주세요.</div>
          ) : (
            <>
              {/* 날짜 이동 */}
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

              {/* ✅ 선택된 1대 상태 표시 + 새로고침 */}
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={refreshStatus}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    background: "white",
                    cursor: "pointer",
                  }}
                  disabled={!bootstrap.selectedDeviceId || devLast.loading} // 디바이스를 아직 안 골랐거나 / 이미 조회 중일 때 버튼을 눌러도 의미가 없거나(대상 없음), 중복 요청이 연속으로 나가서 비용·혼선이 생길 수 있어서 막아둔 것
                  title="선택된 디바이스의 상태 정보를 다시 불러옵니다." // 버튼에 마우스를 올리면 뜨는 **툴팁(설명말)**이라서, 사용자가 “이 버튼이 뭘 하는지” 바로 이해하고, 접근성(키보드/보조기기)에도 도움됨
                >
                  ↻ 상태 새로고침
                </button>

                {/* 상태 뱃지 */}
                {devLast.loading ? (
                  <span style={{ fontSize: 12, color: "#666" }}>상태 확인 중…</span>
                ) : devLast.error ? (
                  <span style={{ fontSize: 12, color: "#b00" }}>
                    ⚠️ 상태 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid #ddd",
                      background:
                        st.tone === "online"
                          ? "#eafff1"
                          : st.tone === "warn"
                          ? "#fff7df"
                          : st.tone === "offline"
                          ? "#ffecec"
                          : "#f4f4f4",
                    }}
                  >
                    {st.text}
                  </span>
                )}

                {/* ✅ 사용자 기준 "상태 확인 시각" */}
                <span style={{ fontSize: 12, color: "#777" }}>
                  상태 확인 시각: {lastCheckedAt ? formatDateTime(lastCheckedAt) : "-"}
                </span>

                {/* ✅ 기기 기준 "최종 수신 시각" */}
                <span style={{ fontSize: 12, color: "#777" }}>
                  기기 최종 수신 시각: {lastServerTsMs ? formatDateTime(lastServerTsMs) : "-"}
                </span>
              </div>
            </>
          )}
        </div>

        {series.loading && <div style={{ marginTop: 12 }}>로딩 중...</div>}

        {(bootstrap.error || series.error) && (
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
            {bootstrap.error ?? series.error}
          </pre>
        )}

        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>데이터(임시 리스트)</h3>
          <SeriesChart
            points={series.points}
            tab={tab}
            dayDate={dayDate}
            monthYearMonth={monthYearMonth}
            year={year}
          />
        </div>

        <div style={{ marginTop: 16, color: "#777", fontSize: 12 }}>
          selectedDeviceId: {bootstrap.selectedDeviceId ?? "(none)"} / tab: {tab}
        </div>
      </div>
    </div>
  );
}
