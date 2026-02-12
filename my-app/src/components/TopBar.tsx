import "./TopBar.css";

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TopBar(props: {
  onToggleSidebar: () => void;
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        <button
          className="iconBtn"
          onClick={props.onToggleSidebar}
          aria-label="사이드바 열기/닫기"
          title="사이드바"
        >
          <IconMenu />
        </button>

        <div className="topbar__title">
          <div className="topbar__titleMain">생산량 모니터링</div>
          <div className="topbar__titleSub">Production Dashboard</div>
        </div>
      </div>

      <div className="topbar__right">
        {props.isLoggedIn ? (
          <button className="primaryBtn" onClick={props.onLogout}>
            로그아웃
          </button>
        ) : (
          <button className="primaryBtn" onClick={props.onLogin}>
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
