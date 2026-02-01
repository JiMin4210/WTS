// src/App.tsx
import { useEffect, useState } from "react";
import { signInWithRedirect, signOut } from "aws-amplify/auth";
import { callAppSync } from "./appsync";
import { Q_LIST_MY_DEVICES, Q_ME } from "./queries";

// 스키마 타입과 맞는 프론트 타입 선언(단순)
type DeviceSummary = { deviceId: string; nickname: string };

export default function App() {
  const [me, setMe] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * 1) 페이지가 열리면:
   * - 이미 로그인된 상태면 토큰이 존재해서 호출이 된다.
   * - 로그인 안 됐으면 callAppSync에서 "로그인 필요" 에러가 난다.
   */
  useEffect(() => {
    (async () => {
      try {
        setError(null);

        // 내 sub 확인(Phase 3-3에서 만들었던 me)
        const meData = await callAppSync<{ me: string }>(Q_ME);
        setMe(meData.me);

        // 내 디바이스 목록 가져오기(좌측 메뉴용)
        const listData = await callAppSync<{ listMyDevices: DeviceSummary[] }>(
          Q_LIST_MY_DEVICES
        );
        setDevices(listData.listMyDevices);
      } catch (e: any) {
        setError(String(e?.message ?? e));
        setMe(null);
        setDevices([]);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h2>Factory Dashboard (Phase 4-1)</h2>

      {/* 로그인/로그아웃 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => signInWithRedirect()}
          // Redirect 로그인은 "즉시 다른 페이지로 이동"하므로 return 값을 기대하지 않는 게 포인트
          // (v6에서 federatedSignIn -> signInWithRedirect로 바뀐 흐름) :contentReference[oaicite:3]{index=3}
        >
          로그인(Hosted UI)
        </button>
        <button onClick={() => signOut({ global: true })}>로그아웃</button>
      </div>

      {/* 현재 로그인 사용자 식별 */}
      <div style={{ marginBottom: 12 }}>
        <b>me(sub):</b> {me ?? "(로그인 필요 또는 아직 불러오는 중)"}
      </div>

      {/* 에러 표시 */}
      {error && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#111",
            color: "#fff",
            padding: 12,
            borderRadius: 8,
          }}
        >
          {error}
        </pre>
      )}

      {/* 좌측 디바이스 목록(Phase 4-2에서 실제 사이드바 UI/토글로 발전) */}
      <div style={{ marginTop: 12 }}>
        <h3>내 디바이스</h3>
        {devices.length === 0 ? (
          <div>(표시할 디바이스 없음) - user_devices 매핑 확인 필요</div>
        ) : (
          <ul>
            {devices.map((d) => (
              <li key={d.deviceId}>
                {/* deviceId는 UI에 숨기고 닉네임만 보여준다고 했지? */}
                {d.nickname}
                {/* 개발 중엔 deviceId를 잠깐 보여줘도 됨(나중에 제거) */}
                <span style={{ color: "#888", marginLeft: 8 }}>
                  ({d.deviceId})
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 다음 페이즈 예고: 디바이스 선택 + 일/월/연 탭 + 그래프 */}
      <div style={{ marginTop: 24, color: "#555" }}>
        다음 페이즈(4-2): 디바이스 클릭 → 일/월/연 탭별 Query 호출 → 그래프 렌더링
      </div>
    </div>
  );
}
