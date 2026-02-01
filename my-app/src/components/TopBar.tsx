import type { MouseEventHandler } from "react";

export function TopBar(props: {
  onToggleSidebar: MouseEventHandler<HTMLButtonElement>;
  isLoggedIn: boolean;
  onLogin: MouseEventHandler<HTMLButtonElement>;
  onLogout: MouseEventHandler<HTMLButtonElement>;
  me: string | null;
}) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={props.onToggleSidebar} title="메뉴">
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
