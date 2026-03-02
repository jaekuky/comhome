import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.png";

const HeroSection = () => {
  const navigate = useNavigate();

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
        <h1
          className="text-3xl font-extrabold leading-tight text-primary-foreground sm:text-4xl animate-fade-up"
        >
          출퇴근 30분,
          <br />
          월세는 더 저렴하게
        </h1>
        <p
          className="mt-4 text-sm leading-relaxed text-primary-foreground/85 sm:text-base animate-fade-up"
          style={{ animationDelay: "0.15s" }}
        >
          회사 주소만 입력하면,
          <br />
          30초 만에 최적의 동네를 찾아드립니다
        </p>
        <Button
          variant="hero"
          size="xl"
          className="mt-8 bg-card text-primary hover:bg-card/90 animate-fade-up"
          style={{ animationDelay: "0.3s" }}
          onClick={() => navigate("/search")}
        >
          내 통근 분석 시작하기
          <ArrowRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </section>
  );
};

export default HeroSection;
