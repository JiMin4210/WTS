import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { callAppSync } from "../appsync";
import { M_ADMIN_TRIGGER_OTA, Q_ADMIN_LIST_DEVICE_LAST, Q_GET_DEVICE_EVENTS } from "../queries";
import { useIsAdmin } from "../hooks/useIsAdmin";
import type { DeviceEvent } from "../types";

type AdminDeviceLast = {
  deviceId: string;
  lastTotal?: number | null;
  lastServerTs?: number | null;
  lastReason?: string | null;
  lastDelta?: number | null;
  boot?: number | null;
  seq?: number | null;
  swVersion?: string | null;
  plcHex?: string | null;
  espHex?: string | null;
};

function CopyButton(props: { value: string; label?: string }) {
  const { value, label = "복사" } = props;
  const [done, setDone] = useState(false);

  async function onCopy(e?: MouseEvent<HTMLButtonElement>) {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      window.setTimeout(() => setDone(false), 900);
    } catch {
      // clipboard 권한/환경 실패 시에는 아무 동작도 하지 않음
    }
  }

  return (
    <button type="button"
      onClick={(e) => onCopy(e)}
      style={{
        padding: "4px 8px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: "white",
        cursor: "pointer",
        fontSize: 12,
      }}
      title="클립보드로 복사"
    >
      {done ? "✓" : label}
    </button>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatDateTime(ms: number) {
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

/**
 * lastServerTs가 초(10자리)로 들어오는 경우도 대비해서 ms로 정규화
 */
function normalizeEpochMs(ts: number | null | undefined): number | null {
  if (!ts || !Number.isFinite(ts)) return null;
  if (ts < 1_000_000_000_000) return ts * 1000;
  return ts;
}

function computeStatus(lastServerTsMs: number | null) {
  if (!lastServerTsMs) return { text: "⚪ 알 수 없음", tone: "unknown" as const };

  const diffMin = (Date.now() - lastServerTsMs) / 1000 / 60;
  if (diffMin > 20) return { text: "🔴 오프라인", tone: "offline" as const };
  if (diffMin > 10) return { text: "🟡 연결 불안정", tone: "warn" as const };
  return { text: "🟢 온라인", tone: "online" as const };
}

type OtaUiState =
  | { state: "idle" }
  | { state: "requested"; requestedAtMs: number }
  | { state: "started"; requestedAtMs: number; startedAtMs?: number | null }
  | { state: "done"; requestedAtMs: number; doneAtMs?: number | null }
  | { state: "timeout"; requestedAtMs: number }
  | { state: "failed"; requestedAtMs: number; message?: string };

type ManifestInfo = {
  version: string;
  url?: string;
};

function parseEventMs(ev: DeviceEvent): number | null {
  // 1) eventKey에 ts#<epochMs>#... 형태가 있으면 그걸 우선
  const ek = String(ev.eventKey ?? "");
  const m = ek.match(/ts#(\d{10,16})/);
  if (m?.[1]) {
    const n = Number(m[1]);
    return normalizeEpochMs(n);
  }
  // 2) ts 필드가 있다면 사용(초/밀리초 혼재 대비)
  const t = (ev as any).ts;
  if (typeof t === "number") return normalizeEpochMs(t);
  return null;
}

function formatLeft(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${pad2(ss)}`;
}

function parseSemver(v: string) {
  // "0.1.10" -> [0,1,10]
  return String(v)
    .trim()
    .split(".")
    .map((x) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    });
}

function cmpSemver(a: string, b: string) {
  const aa = parseSemver(a);
  const bb = parseSemver(b);
  const n = Math.max(aa.length, bb.length);
  for (let i = 0; i < n; i++) {
    const x = aa[i] ?? 0;
    const y = bb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function ConfirmModal(props: {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  if (!props.open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onMouseDown={props.onClose}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          background: "white",
          borderRadius: 14,
          border: "1px solid #e6e6e6",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #eee" }}>
          <div style={{ fontWeight: 700 }}>{props.title}</div>
        </div>
        <div style={{ padding: 14, fontSize: 13, color: "#333" }}>{props.body}</div>
        <div
          style={{
            padding: 14,
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid #eee",
          }}
        >
          <button
            type="button"
            onClick={props.onClose}
            disabled={props.busy}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: props.busy ? "not-allowed" : "pointer",
            }}
          >
            {props.cancelText ?? "취소"}
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={props.busy}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #222",
              background: "#111",
              color: "white",
              cursor: props.busy ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {props.busy ? "처리 중…" : props.confirmText ?? "업데이트 진행"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { isAdmin, loading: adminLoading, error: adminErr } = useIsAdmin();
  const [items, setItems] = useState<AdminDeviceLast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // UI 시간(카운트다운 렌더용). 폴링 tick만으로는 초단위 표시가 갱신되지 않아 별도 ticker를 둠.
  const [nowMs, setNowMs] = useState(() => Date.now());

  // 최신 펌웨어(manifest) 정보(있으면 FOTA 버튼 활성/비활성 판단)
  const [manifest, setManifest] = useState<ManifestInfo | null>(null);
  const [manifestErr, setManifestErr] = useState<string | null>(null);

  // OTA UI 상태 (deviceId별)
  const [otaUi, setOtaUi] = useState<Record<string, OtaUiState>>({});
  const timersRef = useRef<Record<string, number>>({});
  const [modal, setModal] = useState<{ open: boolean; deviceId?: string; swVersion?: string | null }>({
    open: false,
  });
  const [modalBusy, setModalBusy] = useState(false);

  // manifest 1회 로드 (Vite: VITE_FW_MANIFEST_URL)
  useEffect(() => {
    const url = (import.meta as any).env?.VITE_FW_MANIFEST_URL as string | undefined;
    if (!url) {
      setManifest(null);
      setManifestErr(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setManifestErr(null);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
        const j = (await res.json()) as any;
        const v = String(j?.version ?? "").trim();
        if (!v) throw new Error("manifest version 없음");
        const info: ManifestInfo = { version: v, url: j?.url ? String(j.url) : undefined };
        if (!cancelled) setManifest(info);
      } catch (e: any) {
        if (!cancelled) {
          setManifest(null);
          setManifestErr(String(e?.message ?? e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 카운트다운 표시용 ticker
  useEffect(() => {
    // 폴링/대기 상태가 하나라도 있으면 1초 ticker 동작
    const hasActive = Object.values(otaUi).some((s) => s?.state === "requested" || s?.state === "started");
    if (!hasActive) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [otaUi]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await callAppSync<{ adminListDeviceLast: AdminDeviceLast[] }>(
        Q_ADMIN_LIST_DEVICE_LAST,
        { limit: 300 }
      );
      setItems(data.adminListDeviceLast ?? []);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  async function pollEventsOnce(deviceId: string, requestedAtMs: number) {
    const data = await callAppSync<{ getDeviceEvents: DeviceEvent[] }>(Q_GET_DEVICE_EVENTS, {
      deviceId,
      limit: 20,
    });
    const events = data.getDeviceEvents ?? [];
    // 최신 이벤트부터/또는 어떤 순서로 오든, 시간으로 판정
    let hasStart = false;
    let hasDone = false;
    let startMs: number | null = null;
    let doneMs: number | null = null;
    let failMsg: string | undefined;

    for (const ev of events) {
      const t = parseEventMs(ev);
      if (t && t + 2000 < requestedAtMs) continue; // 요청 이전(약간의 시계 오차) 이벤트는 무시
      const ty = String((ev as any).eventType ?? (ev as any).type ?? "");
      if (ty === "OTA_START") {
        hasStart = true;
        startMs = startMs ? Math.min(startMs, t ?? startMs) : t;
      } else if (ty === "OTA_DONE") {
        hasDone = true;
        doneMs = doneMs ? Math.min(doneMs, t ?? doneMs) : t;
      } else if (ty === "OTA_FAIL") {
        // 옵션: 가능한 구간만 보내는 실패 이벤트가 있으면 즉시 실패로 표시
        failMsg = (ev as any).detail?.reason ?? (ev as any).detail ?? undefined;
      }
    }

    if (failMsg) {
      setOtaUi((p) => ({ ...p, [deviceId]: { state: "failed", requestedAtMs, message: String(failMsg) } }));
      return { stop: true };
    }

    if (hasDone) {
      setOtaUi((p) => ({ ...p, [deviceId]: { state: "done", requestedAtMs, doneAtMs: doneMs } }));
      return { stop: true };
    }

    if (hasStart) {
      setOtaUi((p) => ({ ...p, [deviceId]: { state: "started", requestedAtMs, startedAtMs: startMs } }));
      return { stop: false };
    }

    // 아직 이벤트가 없으면 requested 유지
    setOtaUi((p) => {
      const cur = p[deviceId];
      if (cur?.state === "started" || cur?.state === "done" || cur?.state === "failed") return p;
      return { ...p, [deviceId]: { state: "requested", requestedAtMs } };
    });

    return { stop: false };
  }

  function stopPolling(deviceId: string) {
    const t = timersRef.current[deviceId];
    if (t) {
      window.clearInterval(t);
      delete timersRef.current[deviceId];
    }
  }

  async function startOtaFlow(deviceId: string) {
    // 중복 시작 방지(진행 중이면 모달만 닫음)
    const cur = otaUi[deviceId];
    if (cur?.state === "requested" || cur?.state === "started") return;

    const requestedAtMs = Date.now();
    setOtaUi((p) => ({ ...p, [deviceId]: { state: "requested", requestedAtMs } }));

    // 1) 트리거 mutation
    await callAppSync<{ adminTriggerOta: boolean }>(M_ADMIN_TRIGGER_OTA, { deviceId });

    // 2) 폴링: 5초 간격, 최대 5분
    const deadline = requestedAtMs + 5 * 60 * 1000;
    // 첫 1회 즉시
    try {
      const r = await pollEventsOnce(deviceId, requestedAtMs);
      if (r.stop) return;
    } catch {
      // 폴링은 best-effort. 다음 tick에서 다시 시도
    }

    stopPolling(deviceId);
    const intervalId = window.setInterval(async () => {
      // 타임아웃
      if (Date.now() > deadline) {
        stopPolling(deviceId);
        setOtaUi((p) => ({ ...p, [deviceId]: { state: "timeout", requestedAtMs } }));
        return;
      }
      try {
        const r = await pollEventsOnce(deviceId, requestedAtMs);
        if (r.stop) {
          stopPolling(deviceId);
        }
      } catch {
        // ignore
      }
    }, 5000);

    timersRef.current[deviceId] = intervalId;
  }

  useEffect(() => {
    return () => {
      // unmount 시 타이머 정리
      for (const k of Object.keys(timersRef.current)) stopPolling(k);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // 최근 수신 시각 내림차순 정렬(운영자가 보기 편하게)
  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const ta = normalizeEpochMs(a.lastServerTs ?? null) ?? 0;
      const tb = normalizeEpochMs(b.lastServerTs ?? null) ?? 0;
      return tb - ta;
    });
    return arr;
  }, [items]);

  if (adminLoading) return <div style={{ padding: 16 }}>권한 확인 중…</div>;

  if (adminErr) {
    return (
      <div style={{ padding: 16, color: "#b00" }}>
        관리자 권한 확인 실패: {adminErr}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        <h2>접근 불가</h2>
        <p>관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <ConfirmModal
        open={modal.open}
        title="펌웨어 업데이트(FOTA) 확인"
        busy={modalBusy}
        body={
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ color: "#b00", fontWeight: 700 }}>
              ⚠️ 업데이트 중 재부팅이 발생합니다. 작업 중이라면 진행하지 마세요.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 6, fontSize: 12 }}>
              <div style={{ color: "#666" }}>대상</div>
              <div style={{ fontFamily: "monospace" }}>{modal.deviceId}</div>
              <div style={{ color: "#666" }}>현재 버전</div>
              <div style={{ fontFamily: "monospace" }}>{modal.swVersion ?? "-"}</div>
              <div style={{ color: "#666" }}>진행 방식</div>
              <div>단일 디바이스(1대) 업데이트</div>
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              실행 후 5분 동안 자동으로 상태를 확인합니다. (OTA_START / OTA_DONE)
            </div>
          </div>
        }
        onClose={() => {
          if (!modalBusy) setModal({ open: false });
        }}
        onConfirm={async () => {
          if (!modal.deviceId) return;
          setModalBusy(true);
          try {
            await startOtaFlow(modal.deviceId);
            setModal({ open: false });
          } catch (e) {
            // 화면 상단 error에 표시
            setError(String((e as any)?.message ?? e));
          } finally {
            setModalBusy(false);
          }
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>운영자 페이지</h2>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          ↻ 전체 상태 새로고침
        </button>


<button
  type="button"
  onClick={() => {
    const allOpen =
      sorted.length > 0 && sorted.every((d) => expanded[d.deviceId]);
    if (allOpen) {
      setExpanded({});
    } else {
      const next: Record<string, boolean> = {};
      for (const d of sorted) next[d.deviceId] = true;
      setExpanded(next);
    }
  }}
  style={{
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "white",
    cursor: "pointer",
  }}
  title="현재 목록의 상세를 한 번에 펼치거나 접습니다."
>
  {sorted.length > 0 && sorted.every((d) => expanded[d.deviceId])
    ? "상세 전체 닫기"
    : "상세 전체 펼치기"}
</button>

        <span style={{ fontSize: 12, color: "#777" }}>
          총 {sorted.length}대
        </span>
      </div>

      {loading && <div style={{ marginTop: 10 }}>로딩 중…</div>}

      {error && (
        <div style={{ marginTop: 10, color: "#b00" }}>
          ⚠️ 불러오기 실패: {error}
        </div>
      )}

      <div style={{ marginTop: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <div
          style={{
            padding: 10,
            borderBottom: "1px solid #eee",
            fontWeight: 600,
            background: "#fafafa",
          }}
        >
          디바이스 최근 수신 현황(device_last)
        </div>

        <div style={{ maxHeight: 600, overflowY: "auto" }}>
          {sorted.map((it) => {
            const lastMs = normalizeEpochMs(it.lastServerTs ?? null);
            const st = computeStatus(lastMs);
            const isOpen = !!expanded[it.deviceId];

            const curVer = (it.swVersion ?? "").trim();
            const latestVer = (manifest?.version ?? "").trim();

            const hasManifest = !!latestVer;
            const canCompare = !!curVer && hasManifest;
            const updateAvailable = canCompare ? cmpSemver(latestVer, curVer) > 0 : false;
            const otaEnabled = st.tone === "online" && hasManifest && !!curVer && updateAvailable;

            const otaDisabledReason = (() => {
              if (st.tone !== "online") return "오프라인(또는 상태 불안정)";
              if (!hasManifest) return manifestErr ? `manifest 조회 실패(${manifestErr})` : "manifest 미설정";
              if (!curVer) return "현재 버전 정보 없음";
              if (!updateAvailable) return "최신 버전 없음";
              return null;
            })();

            return (
              <div key={it.deviceId} style={{ borderBottom: "1px solid #f2f2f2" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "220px 140px 200px 90px 1fr 88px",
                    gap: 10,
                    padding: "10px 12px",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "monospace" }}>{it.deviceId}</div>

                  <div style={{ fontSize: 12 }}>
                    <span
                      style={{
                        padding: "3px 10px",
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
                  </div>

                  <div style={{ fontSize: 12, color: "#666" }}>
                    최종 수신: {lastMs ? formatDateTime(lastMs) : "-"}
                  </div>

                  <div style={{ fontSize: 12 }}>Δ {it.lastDelta ?? "-"}</div>

                  <div style={{ fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {it.lastReason ?? "-"}
                  </div>

                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [it.deviceId]: !p[it.deviceId] }))}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      background: "white",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {isOpen ? "닫기" : "상세"}
                  </button>
                </div>

                {isOpen ? (
                  <div style={{ padding: "0 12px 12px 12px" }}>
                    {/* OTA 상태 */}
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: 10,
                          border: "1px solid #eee",
                          borderRadius: 10,
                          background: "#fff",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "#333" }}>
                          <div style={{ fontWeight: 700, marginBottom: 2 }}>FOTA</div>
                          <div style={{ color: "#666", marginBottom: 4 }}>
                            현재: <span style={{ fontFamily: "monospace" }}>{curVer || "-"}</span> · 최신: {hasManifest ? (
                              <span style={{ fontFamily: "monospace" }}>{latestVer}</span>
                            ) : (
                              <span>미확인</span>
                            )}
                          </div>
                          {(() => {
                            const st = otaUi[it.deviceId] ?? { state: "idle" as const };
                            if (st.state === "idle") {
                              return (
                                <div style={{ color: "#666" }}>
                                  대기
                                  {otaDisabledReason ? (
                                    <span style={{ marginLeft: 8, color: "#999" }}>· {otaDisabledReason}</span>
                                  ) : null}
                                </div>
                              );
                            }
                            if (st.state === "requested") {
                              const left = 5 * 60 * 1000 - (nowMs - st.requestedAtMs);
                              return (
                                <div>
                                  요청됨 · 확인 중… <span style={{ color: "#666" }}>({formatLeft(left)})</span>
                                </div>
                              );
                            }
                            if (st.state === "started") {
                              const left = 5 * 60 * 1000 - (nowMs - st.requestedAtMs);
                              return (
                                <div>
                                  다운로드 시작 감지 · 완료 대기… <span style={{ color: "#666" }}>({formatLeft(left)})</span>
                                </div>
                              );
                            }
                            if (st.state === "done") return <div style={{ color: "#0a7" }}>업데이트 완료 ✅</div>;
                            if (st.state === "timeout") return <div style={{ color: "#b00" }}>실패(타임아웃) ❌</div>;
                            if (st.state === "failed") return <div style={{ color: "#b00" }}>실패 ❌ {st.message ? `(${st.message})` : ""}</div>;
                            return null;
                          })()}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!otaEnabled) return;
                              setModal({ open: true, deviceId: it.deviceId, swVersion: it.swVersion ?? null });
                            }}
                            disabled={!otaEnabled}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 10,
                              border: "1px solid #222",
                              background: otaEnabled ? "#111" : "#eee",
                              color: otaEnabled ? "white" : "#777",
                              cursor: otaEnabled ? "pointer" : "not-allowed",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                            title={otaEnabled ? "이 디바이스에 대해 OTA를 실행합니다" : (otaDisabledReason ?? "실행 불가")}
                          >
                            FOTA 실행
                          </button>
                          {(otaUi[it.deviceId]?.state === "requested" || otaUi[it.deviceId]?.state === "started") ? (
                            <button
                              type="button"
                              onClick={() => {
                                // UI 폴링만 중지(디바이스 OTA 자체를 멈추진 않음)
                                stopPolling(it.deviceId);
                                const cur = otaUi[it.deviceId];
                                if (cur && (cur.state === "requested" || cur.state === "started")) {
                                  setOtaUi((p) => ({ ...p, [it.deviceId]: { state: "idle" } }));
                                }
                              }}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #ddd",
                                background: "white",
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                              title="현재 화면의 상태 확인(폴링)만 중지합니다"
                            >
                              확인 중지
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 10,
                        padding: 10,
                        background: "#fafafa",
                        display: "grid",
                        gridTemplateColumns: "160px 1fr",
                        gap: 8,
                        fontSize: 12,
                        color: "#333",
                      }}
                    >
                      <div style={{ color: "#666" }}>swVersion</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: "monospace" }}>{it.swVersion ?? "-"}</span>
                      </div>

                      <div style={{ color: "#666" }}>boot / seq</div>
                      <div style={{ fontFamily: "monospace" }}>
                        {it.boot ?? "-"} / {it.seq ?? "-"}
                      </div>

                      <div style={{ color: "#666" }}>plc_hex (last)</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                          {it.plcHex ??  "-"}
                        </span>
                        {it.plcHex ? <CopyButton value={it.plcHex} /> : null}
                      </div>

                      <div style={{ color: "#666" }}>esp_hex (last)</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                          {it.espHex ??  "-"}
                        </span>
                        {it.espHex ? <CopyButton value={it.espHex} /> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {sorted.length === 0 && !loading && (
            <div style={{ padding: 12, color: "#666" }}>데이터가 없습니다.</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#777" }}>
        운영자 도구는 “운영 상황 빠른 파악”을 위한 화면입니다. (일반 사용자 접근 불가)
      </div>
    </div>
  );
}
