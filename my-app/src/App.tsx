import { useState } from "react";
import { signInWithRedirect, signOut } from "aws-amplify/auth";

import { useBootstrap } from "./hooks/useBootstrap";
import { useSeries } from "./hooks/useSeries";

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

export default function App() {
  // 1) 로그인 사용자 + 디바이스 목록
  const bootstrap = useBootstrap();

  // 2) UI 상태
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("day");

  const [dayDate, setDayDate] = useState(formatDate(new Date()));
  const [monthYearMonth, setMonthYearMonth] = useState(formatYearMonth(new Date()));
  const [year, setYear] = useState(String(new Date().getFullYear()));

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

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      <Sidebar
        open={sidebarOpen}
        devices={bootstrap.devices}
        selectedDeviceId={bootstrap.selectedDeviceId}
        onSelectDevice={(id) => bootstrap.setSelectedDeviceId(id)}
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
