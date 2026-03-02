

## /result 페이지 전면 리뉴얼 계획

### 1. 데이터베이스 변경 (2개 migration)

**neighborhoods 테이블 생성:**
- `id`, `name`, `district`, `city`, `avg_rent` (만원), `latitude`, `longitude`, `transit_lines` (jsonb), `description`
- RLS: public SELECT

**recommended_neighborhoods 테이블 생성:**
- `id`, `company_id` (FK → companies), `neighborhood_id` (FK → neighborhoods), `rank`, `commute_minutes`, `commute_route` (text), `savings_amount` (만원)
- RLS: public SELECT

**시드 데이터:** 주요 회사별 7~10개 추천 동네 매핑 (총 ~20개 동네, ~60개 추천 레코드)

### 2. ResultPage 전면 재구성

페이지를 3단계 상태로 구성:

**Phase 1 - Narrative Loading (2.4초)**
- 4단계 메시지가 0.6초 간격으로 전환
- 프로그레스 바 25%씩 채워짐 (gradient-primary)
- 회사명을 메시지에 동적 삽입

**Phase 2 - 결과 표시**
순서대로 렌더링:

1. **인사이트 배너** (Loss Aversion): "현재 통근 50분 → 추천 동네로 이사하면 연간 396시간 절약" - 연한 블루 그라데이션 배경

2. **요약 카드 3개** (가로 스크롤, `overflow-x-auto`):
   - 추천 동네 수 (카운트업 0→N)
   - 평균 통근 시간 (카운트다운 60→실제값)
   - 월 절감 가능액 (카운트업 0→N만원)
   - 각 카드에 아이콘 + 수치 + 라벨

3. **필터 탭**: "추천순" | "통근시간순" | "월세순" - 탭 전환 시 리스트 재정렬

4. **동네 카드 리스트**: 
   - 이름 + 구/시 태그
   - 통근 시간 배지 (초록 배경)
   - 평균 월세, 절감액 (초록 텍스트)
   - "자세히 보기" → `/neighborhood/:id`
   - Intersection Observer로 peek-a-boo 애니메이션

5. **공유 버튼**: 상단에 Share 아이콘, 클릭 시 `navigator.clipboard` + 토스트

**EC-004 처리**: 결과 0건 → "30분 이내 추천 동네를 찾지 못했어요" + 40분 확장 버튼

### 3. 컴포넌트 분리

```text
src/pages/ResultPage.tsx          (메인 오케스트레이터)
src/components/result/
  NarrativeLoading.tsx            (로딩 애니메이션)
  SummaryCards.tsx                (카운터 애니메이션 요약)
  InsightBanner.tsx               (Loss Aversion 배너)
  NeighborhoodCard.tsx            (개별 동네 카드)
  FilterTabs.tsx                  (정렬 필터)
```

### 4. 커스텀 훅

- `useCountUp(target, duration)` - 숫자 카운트업 애니메이션 훅
- Supabase 쿼리: `recommended_neighborhoods` JOIN `neighborhoods` WHERE `company_id` = selected

### 5. 추가 CSS

- `animate-fade-up` keyframe (translateY(20px) → 0)
- peek-a-boo용 Intersection Observer 클래스

