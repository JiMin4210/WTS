// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { configureAmplify } from "./amplify.ts";
import { BrowserRouter } from "react-router-dom";

// ✅ 전역 UI 스타일(레이아웃/타이포/버튼 기본)
import "./styles/global.css";

configureAmplify();
// 모바일 브라우저가 시스템 다크모드일 때 페이지를 임의로 어둡게 변환하는 현상을 최대한 방지
(function forceLightColorScheme() {
  try {
    document.documentElement.style.colorScheme = "light";
    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };
    ensureMeta("color-scheme", "light");
    ensureMeta("theme-color", "#f6f7fb");
  } catch {}
})();


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
