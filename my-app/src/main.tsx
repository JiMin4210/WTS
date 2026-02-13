// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { configureAmplify } from "./amplify.ts";
import { BrowserRouter } from "react-router-dom";

// ✅ 전역 UI 스타일(레이아웃/타이포/버튼 기본)
import "./styles/global.css";

configureAmplify();

// ✅ 시스템 다크모드에서 모바일 브라우저가 페이지를 임의로 어둡게 만드는 것을 최대한 방지
// - 디자인은 '라이트 테마 고정' (데스크탑과 동일한 톤)
// - index.html을 건드리지 않고도 메타 태그를 동적으로 추가
function enforceLightColorScheme() {
  try {
    document.documentElement.style.colorScheme = "light";
    const existing = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (existing) {
      existing.content = "light";
    } else {
      const meta = document.createElement("meta");
      meta.name = "color-scheme";
      meta.content = "light";
      document.head.appendChild(meta);
    }
  } catch {
    // no-op
  }
}

enforceLightColorScheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
