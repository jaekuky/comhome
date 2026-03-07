import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.png";

const MICROCOPY = [
  "강남역 직장인 73%가 몰랐던 숨은 동네",
  "판교 출퇴근 평균 47분 → 22분으로",
  "월 12만원 추가로 매일 1시간 되찾기",
] as const;

const HeroSection = () => {
  const navigate = useNavigate();
  const [microcopyIndex, setMicrocopyIndex] = useState(0);
  const [microcopyVisible, setMicrocopyVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setMicrocopyVisible(false);
      setTimeout(() => {
        setMicrocopyIndex((prev) => (prev + 1) % MICROCOPY.length);
        setMicrocopyVisible(true);
      }, 350);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Background image with gradient overlay */}
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="서울 도시 스카이라인"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 gradient-primary opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative mobile-container flex flex-col items-center justify-center py-20 text-center">
        {/* Social proof stat */}
        <p
          className="text-xs font-medium text-primary-foreground/70 tracking-wide uppercase animate-fade-up"
        >
          서울 직장인 평균 통근 시간 <span className="text-primary-foreground font-bold">47분</span> — 당신은?
        </p>

        <h1
          className="mt-5 text-3xl font-extrabold leading-tight text-primary-foreground sm:text-4xl animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          출퇴근 30분,
          <br />
          월세는 더 저렴하게
        </h1>
        <p
          className="mt-4 text-sm leading-relaxed text-primary-foreground/85 sm:text-base animate-fade-up"
          style={{ animationDelay: "0.2s" }}
        >
          회사 주소만 입력하면,
          <br />
          30초 만에 최적의 동네를 찾아드립니다
        </p>
        <Button
          variant="hero"
          size="xl"
          className="mt-8 bg-card text-foreground hover:bg-card/90 animate-fade-up"
          style={{ animationDelay: "0.35s" }}
          onClick={() => navigate("/search")}
        >
          내 통근 분석 시작하기
          <ArrowRight className="ml-1 h-5 w-5" />
        </Button>

        {/* Rotating microcopy */}
        <p
          className={`mt-4 inline-block rounded-full bg-black/25 px-4 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition-opacity duration-300 animate-fade-up ${microcopyVisible ? "opacity-100" : "opacity-0"}`}
          style={{ animationDelay: "0.45s" }}
        >
          {MICROCOPY[microcopyIndex]}
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
