import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { callAppSync } from "../appsync";
import { Q_ADMIN_LIST_DEVICE_LAST } from "../queries";
import { useIsAdmin } from "../hooks/useIsAdmin";

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

function clip(s: string, max = 48) {
  const t = String(s ?? "");
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 3))}...`;
}

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

export function AdminPage() {
  const { isAdmin, loading: adminLoading, error: adminErr } = useIsAdmin();
  const [items, setItems] = useState<AdminDeviceLast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
