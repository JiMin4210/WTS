import "./TopBar.css";

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}


function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 7V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M16 12H3m0 0 3-3m-3 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
          <button
            className="btn btnSm btnGhost topbar__action"
            onClick={props.onLogout}
            aria-label="로그아웃"
            title="로그아웃"
          >
            <span className="topbar__actionIcon" aria-hidden>
              <IconLogout />
            </span>
            <span className="topbar__actionText">로그아웃</span>
          </button>
        ) : (
          <button className="btn btnSm btnGhost topbar__action" onClick={props.onLogin}>
            로그인
          </button>
        )}
      </div>
    </header>
  );
}

