import { useEffect, useRef, useState } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";

const testimonials = [
  {
    name: "김지현",
    role: "강남구 IT기업 근무",
    text: "매일 1시간 넘게 걸리던 출퇴근이 25분으로 줄었어요. 월세도 오히려 10만원 절약!",
  },
  {
    name: "박성민",
    role: "판교 스타트업 근무",
    text: "회사 근처만 알아보다가 ComHome으로 의외의 동네를 발견했어요. 삶의 질이 달라졌습니다.",
  },
  {
    name: "이수아",
    role: "여의도 금융사 근무",
    text: "교통비까지 포함한 실질 비용 비교가 정말 유용해요. 이사 결정에 큰 도움이 됐어요.",
  },
];

function AnimatedCounter({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 1500;
          const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-3xl font-extrabold gradient-primary-text">
      {count.toLocaleString()}명
    </div>
  );
}

const SocialProofSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  return (
    <section className="py-12 bg-muted/50">
      <div className="mobile-container space-y-8">
        {/* Counter */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <AnimatedCounter target={3200} />
          <p className="text-sm text-muted-foreground">
            매달 2시간의 출퇴근 시간을 절약한 직장인
          </p>
        </div>

        {/* Testimonial carousel */}
        <div className="relative">
          <div className="overflow-hidden rounded-xl">
            <div
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {testimonials.map((t) => (
                <div key={t.name} className="w-full flex-shrink-0 px-1">
                  <div className="rounded-xl bg-card p-5 shadow-card">
                    <p className="text-sm text-foreground leading-relaxed">
                      "{t.text}"
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={prevSlide}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    i === currentSlide
                      ? "w-4 gradient-primary"
                      : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={nextSlide}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
