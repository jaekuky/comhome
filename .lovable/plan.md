

## 서비스 완성도 향상 구현 계획

7개 영역을 구현합니다: 마이크로 인터랙션, 반응형 최적화, 이벤트 트래킹, 온보딩 툴팁, 접근성, 에러 바운더리, SEO.

### 1. 마이크로 인터랙션 보강

**Breathing Input** (SearchPage): `animate-breathing` 이미 존재하나 box-shadow 기반 → scale 기반으로 변경. `@keyframes breathe` 추가 (scale 1→1.005→1). 쿼리 비어있을 때만 적용.

**Confidence Tick**: SearchPage 입력창 우측에 체크 아이콘 pop-in 추가 (0.3s scale 0→1). `@keyframes pop-in` CSS 추가.

**Counter Animation**: `useCountUp` 훅에 easeOutExpo 곡선 적용 (현재 easeOutCubic), duration 1500ms. SummaryCards에 blur→clear 효과 추가.

**Peek-a-boo Card**: NeighborhoodCard에 이미 IntersectionObserver + stagger 있음. translateY 30px→0, 0.5s ease-out으로 조정.

**Scarcity Counter**: NeighborhoodPage에 "이 동네를 본 사람: 오늘 N명" 컴포넌트 추가. 30~60초 간격 랜덤 +1 카운트.

### 2. 반응형 최적화

- `index.css`에 `safe-area-inset` padding 추가
- 터치 타겟 최소 44px 확인/적용 (`min-h-[44px] min-w-[44px]`)
- 데스크톱에서 max-width 480px 중앙 정렬은 이미 `mobile-container`로 적용됨
- 태블릿 breakpoint에서 적절한 그리드 조정 (결과 카드 등)

### 3. 이벤트 트래킹

**새 파일**: `src/lib/analytics.ts`
- `trackEvent(eventName, params)` — session_id (sessionStorage), timestamp, company_id 자동 포함
- 개발 모드: `console.log('[Analytics]', ...)` 출력
- GA4 준비: `window.gtag` 존재 시 호출

**이벤트 삽입 위치**:
- SearchPage: `search_start` (첫 글자), `company_selected`
- ResultPage: `analysis_triggered`, `analysis_completed`, `neighborhood_clicked`, `share_clicked`
- NeighborhoodPage: `neighborhood_detail_viewed`, `compare_added`, `housing_viewed`
- App.tsx: `page_view` (route 변경 감지)

### 4. 온보딩 툴팁

**새 파일**: `src/components/OnboardingTooltip.tsx`
- 말풍선 컴포넌트 (absolute 위치, 꼬리 포함)
- localStorage `onboarding_completed` 체크하여 1회만 표시
- SearchPage: 입력창 위 "회사 이름을 입력해보세요! 🏢"
- ResultPage: 필터 탭 위 "정렬 기준을 바꿔보세요"
- 클릭/입력 시 자동 dismiss

### 5. 접근성 (a11y)

- SearchPage 자동완성: `role="listbox"`, `aria-expanded`, 각 항목 `role="option"`, 키보드 Tab/Enter/ArrowDown 네비게이션
- 모든 아이콘 버튼에 `aria-label` 추가
- Skip navigation 링크: App.tsx에 `<a href="#main-content" className="sr-only focus:not-sr-only">` 추가
- `<main id="main-content">` 적용

### 6. 에러 바운더리

**새 파일**: `src/components/ErrorBoundary.tsx`
- React class component with `componentDidCatch`
- "일시적인 오류가 발생했어요" + 새로고침 버튼 UI
- App.tsx에서 Routes를 ErrorBoundary로 래핑

### 7. SEO 메타태그

- `index.html`: title → "ComHome - 출퇴근 30분, 월세는 더 저렴하게", description 업데이트, og 태그 수정
- 각 페이지에 `document.title` 동적 설정 (`useEffect`)
- `public/manifest.json` 생성 (PWA 기초)

### 구현 순서

1. CSS 애니메이션 + index.html SEO → 기반 작업
2. `src/lib/analytics.ts` + `ErrorBoundary` + `OnboardingTooltip` → 유틸/공통 컴포넌트
3. 각 페이지 수정 (SearchPage, ResultPage, NeighborhoodPage, App.tsx) → 통합

### 파일 변경 목록

```text
신규:
  src/lib/analytics.ts
  src/components/ErrorBoundary.tsx
  src/components/OnboardingTooltip.tsx
  public/manifest.json

수정:
  index.html                          (SEO + manifest 링크)
  src/index.css                       (새 keyframes + safe-area)
  tailwind.config.ts                  (새 animation 추가)
  src/hooks/useCountUp.ts             (easeOutExpo 곡선)
  src/App.tsx                         (ErrorBoundary + skip-nav + page_view 트래킹)
  src/main.tsx                        (session_id 초기화)
  src/pages/SearchPage.tsx            (breathing scale, confidence tick, 온보딩, a11y, 트래킹)
  src/pages/ResultPage.tsx            (counter blur, 온보딩, 트래킹)
  src/pages/NeighborhoodPage.tsx      (scarcity counter, 트래킹)
  src/components/result/NeighborhoodCard.tsx  (peek-a-boo 조정)
  src/components/result/SummaryCards.tsx      (blur 효과)
```

