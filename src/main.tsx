import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// 카카오 SDK 초기화 (공유 기능용)
const kakao = (window as Window & { Kakao?: { init: (key: string) => void; isInitialized: () => boolean } }).Kakao;
const kakaoKey = import.meta.env.VITE_KAKAO_MAPS_JS_KEY;
if (kakao && kakaoKey && !kakao.isInitialized()) {
  kakao.init(kakaoKey);
}

createRoot(document.getElementById("root")!).render(<App />);
