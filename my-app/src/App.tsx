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

import "./App.css";

import { Routes, Route, Navigate } from "react-router-dom";
import { AdminPage } from "./pages/AdminPage";

// ✅ 사이드바 기본 동작(모바일/좁은 화면에서 닫아두는 기본값)
// - "차별 UI"가 아니라, 기본 열림/닫힘만 다르게 잡는 정도로만 사용
// - 마음이 바뀌면 DEFAULT_SIDEBAR_OPEN_ON_NARROW 값을 true로 바꾸면 됨
const SIDEBAR_NARROW_PX = 768;
const DEFAULT_SIDEBAR_OPEN_ON_NARROW = false;
const SIDEBAR_OPEN_KEY = "wts_sidebar_open";

function getInitialSidebarOpen() {
  try {
    const saved = localStorage.getItem(SIDEBAR_OPEN_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch { }
  if (typeof window !== "undefined" && window.innerWidth < SIDEBAR_NARROW_PX) {
    return DEFAULT_SIDEBAR_OPEN_ON_NARROW;
  }
  return true;
}

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
  if (!lastServerTsMs) return { label: "알 수 없음", tone: "unknown" as const };

  const diffMin = (Date.now() - lastServerTsMs) / 1000 / 60;
  if (diffMin > 20) return { label: "오프라인", tone: "offline" as const };
  if (diffMin > 10) return { label: "연결 불안정", tone: "warn" as const };
  return { label: "온라인", tone: "online" as const };
}

export default function App() {
  // 1) 로그인 사용자 + 디바이스 목록
  const bootstrap = useBootstrap();

  // 2) UI 상태
  //React에서 일반 변수(let, const)는 값이 변해도 화면을 다시 그리지 않습니다. 하지만 useState는 값이 바뀌면 "어? 데이터 바뀌었네? 화면 다시 그려야지!" 하고 React에게 알려주는 특수 변수입니다.
  // 1. 기본형: (값) -> React가 초기값을 보고 타입을 자동으로 알아챕니다
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen());
  // 2. 제네릭형: <Tab> -> "이 변수는 오직 Tab 타입(예: 'day' | 'week')만 들어올 수 있어"라고 명시하는 겁니다. (TypeScript)
  const [tab, setTab] = useState<Tab>("day");

  // 3. 날짜 관련: 문자열로 초기화
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

  // ✅ "선택된 디바이스"의 모든 관련 데이터 새로고침
  // - device_last(상태) + 현재 탭 시계열(생산량)
  // - 추후 원격제어 상태/설정값 등도 여기에 추가하면 한 번에 갱신 가능
  async function refreshDeviceAll() {
    if (!bootstrap.selectedDeviceId) return;

    // 병렬로 갱신(체감 속도 개선)
    await Promise.all([
      devLast.refresh(),
      series.refresh(),
      // 추후 추가 예시:
      // deviceConfig.refresh(),
      // deviceSettings.refresh(),
      // alerts.refresh(),
    ]);

    // "상태 확인 시각"은 사용자 새로고침 기준으로 기록
    setLastCheckedAt(Date.now());
  }

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

  // ✅ 표시용 값 준비
  const lastServerTsMs = normalizeEpochMs(devLast.last?.lastServerTs ?? null);
  const st = computeStatus(lastServerTsMs);

  return (
    <Routes>
      {/* 1. 경로 설정: 주소가 /admin이면 관리자 페이지를 보여줌 */}
      <Route path="/admin" element={<AdminPage />} />

      {/* 2. 메인 경로: 주소가 / 일 때 전체 레이아웃 시작 */}
      <Route
        path="/"
        element={
          <div className="appShell">
            {/* [왼쪽 사이드바] 장치 목록을 보여주고 선택하는 컴포넌트 */}
            <Sidebar
              open={sidebarOpen}
              devices={bootstrap.devices}
              selectedDeviceId={bootstrap.selectedDeviceId}
              onSelectDevice={(id) => bootstrap.setSelectedDeviceId(id)}
              // ✅ 추가: 삭제 / 등록 후 갱신
              onRemoveDevice={(id) => bootstrap.removeDevice(id)}
              onRegistered={() => bootstrap.refreshDevices()}
            />

            {/* [오른쪽 메인 콘텐츠 영역] */}
            <main className="appMain">

              {/* [상단 바] 로그인 정보 및 사이드바 토글 버튼 */}
              <TopBar
                onToggleSidebar={() => setSidebarOpen((v) => {
                  const next = !v;
                  // 로컬 스토리지에 사이드바 상태 저장 (새로고침해도 유지되게)
                  try { localStorage.setItem(SIDEBAR_OPEN_KEY, next ? "1" : "0"); } catch { }
                  return next;
                })}
                isLoggedIn={bootstrap.isLoggedIn}
                onLogin={() => signInWithRedirect()} // 로그인 실행 함수
                onLogout={() => signOut({ global: true })} // 로그아웃 실행 함수
              />

              {/* [탭 메뉴] 일/월/연 선택창. 클릭 시 부모의 tab 상태가 변함 */}
              <Tabs tab={tab} onChange={setTab} />

              {/* [중앙 컨트롤 카드] 날짜 이동 + 상태(선택 1대) */}
              <section className="controlCard card">
                {!bootstrap.selectedDeviceId ? (
                  <div className="muted">좌측에서 디바이스를 선택해주세요.</div>
                ) : (
                  <>
                    {/* 날짜 네비게이터 (탭별) */}
                    {tab === "day" && (
                      <div className="dateNavRow">
                        <button className="iconBtn" onClick={() => moveDay(-1)} aria-label="이전 날짜">◀</button>
                        <div className="dateNavCenter" aria-live="polite">
                          <div className="dateNavLabel">일</div>
                          <div className="dateNavValue">{dayDate}</div>
                        </div>
                        <button className="iconBtn" onClick={() => moveDay(+1)} aria-label="다음 날짜">▶</button>
                      </div>
                    )}

                    {tab === "month" && (
                      <div className="dateNavRow">
                        <button className="iconBtn" onClick={() => moveMonth(-1)} aria-label="이전 달">◀</button>
                        <div className="dateNavCenter" aria-live="polite">
                          <div className="dateNavLabel">월</div>
                          <div className="dateNavValue">{monthYearMonth}</div>
                        </div>
                        <button className="iconBtn" onClick={() => moveMonth(+1)} aria-label="다음 달">▶</button>
                      </div>
                    )}

                    {tab === "year" && (
                      <div className="dateNavRow">
                        <button className="iconBtn" onClick={() => moveYear(-1)} aria-label="이전 연도">◀</button>
                        <div className="dateNavCenter" aria-live="polite">
                          <div className="dateNavLabel">연</div>
                          <div className="dateNavValue">{year}</div>
                        </div>
                        <button className="iconBtn" onClick={() => moveYear(+1)} aria-label="다음 연도">▶</button>
                      </div>
                    )}

                    <div className="controlDivider" />

                    {/* 상태 영역 */}
                    <div className="statusRow">
                      <div className="statusLeft">
                        <span className={`chip chip--${st.tone}`}>{st.label}</span>

                        <span className="metaInline">
                          <span className="metaLabel">마지막 수신</span>
                          <span className="metaValue">{lastServerTsMs ? formatDateTime(lastServerTsMs) : "-"}</span>
                        </span>
                      </div>

                      <div className="statusRight">
                        <button
                          onClick={refreshDeviceAll}
                          className="btn btnSm btnGhost refreshBtn"
                          disabled={!bootstrap.selectedDeviceId || devLast.loading || series.loading}
                          title="선택된 디바이스의 상태/데이터를 다시 불러옵니다."
                        >
                          <span className="refreshIcon" aria-hidden>↻</span>
                          <span className="refreshText">새로고침</span>
                        </button>

                        {devLast.loading ? (
                          <span className="muted statusHint">상태 확인 중…</span>
                        ) : devLast.error ? (
                          <span className="statusError">⚠️ 상태 정보를 불러오지 못했습니다.</span>
                        ) : null}
                      </div>
                    </div>
             
                  </>
                )}
              </section>
{/* [데이터 로딩 알림] 시계열 데이터(차트 데이터) 로딩 중일 때 표시 */}
              {series.loading && <div style={{ marginTop: 12 }}>로딩 중...</div>}

              {/* [에러 메시지 박스] 장치 정보나 차트 데이터 로딩 중 에러 발생 시 검은 박스 출력 */}
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

              {/* [메인 차트 영역] useSeries에서 가져온 데이터를 시각화함 */}
              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 8 }}>데이터(임시 리스트)</h3>
                <SeriesChart
                  points={series.points} // 실제 그래프 데이터 전달
                  tab={tab}
                  dayDate={dayDate}
                  monthYearMonth={monthYearMonth}
                  year={year}
                />
              </div>

              {/* ✅ 사용자 동작 기준(수동 새로고침/자동조회) 시각: 화면 하단 좌측 */}
              <div className="lastChecked muted">
                마지막 새로고침: {lastCheckedAt ? formatDateTime(lastCheckedAt) : "-"}
              </div>

              {/* [디버깅 영역] 하단에 현재 선택된 장치 ID와 탭 정보를 작게 표시 */}
              {import.meta.env.DEV && (
                <div style={{ marginTop: 16, color: "#777", fontSize: 12 }}>
                  selectedDeviceId: {bootstrap.selectedDeviceId ?? "(none)"} / tab: {tab}
                </div>
              )}
            </main>
          </div>
        }
      />

       {/* 주소창에 잘못된 경로 입력 시 자동으로 메인(/)으로 이동 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
