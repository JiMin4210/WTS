// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { configureAmplify } from "./amplify.ts";
import { BrowserRouter } from "react-router-dom";

// ✅ 전역 UI 스타일(레이아웃/타이포/버튼 기본)
import "./styles/global.css";

configureAmplify();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
