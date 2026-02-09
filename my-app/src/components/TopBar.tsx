import type { MouseEventHandler } from "react";

export function TopBar(props: {
  onToggleSidebar: MouseEventHandler<HTMLButtonElement>;
  isLoggedIn: boolean;
  onLogin: MouseEventHandler<HTMLButtonElement>;
  onLogout: MouseEventHandler<HTMLButtonElement>;
  me: string | null;
}) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", paddingBottom: 6 }}>
      <button onClick={props.onToggleSidebar} title="사이드바 열기/닫기" aria-label="사이드바 토글">
        ☰
      </button>

      {!props.isLoggedIn ? (
        <button onClick={props.onLogin}>로그인</button>
      ) : (
        <button onClick={props.onLogout}>로그아웃</button>
      )}

      <div style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}>
        me(sub): {props.me ?? "(로그인 필요)"}
      </div>
    </div>
  );
}
