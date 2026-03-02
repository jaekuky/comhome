

## 동네 상세, 비용 비교, 매물 리스트 페이지 구현 계획

### 1. 데이터베이스 변경

**housing_listings 테이블 생성** (migration):
- `id`, `neighborhood_id` (FK → neighborhoods), `type` (text: "원룸"/"투룸"/"쓰리룸+"), `deposit` (만원), `monthly_rent` (만원), `area_sqm` (float), `floor` (int), `distance_to_station` (int, 도보 분), `description`
- RLS: public SELECT

**시드 데이터**: 동네별 5~8개 매물, 총 ~100개 레코드

### 2. 상태 관리 (Zustand store 확장)

`searchStore.ts`에 비교 목록 추가:
- `compareList: NeighborhoodResult[]` (최대 3개)
- `addToCompare`, `removeFromCompare`, `clearCompare`

### 3. /neighborhood/:id 페이지 (5개 섹션)

**데이터 로딩**: neighborhood + recommended_neighborhoods (company_id from searchStore) + housing_listings를 Supabase에서 fetch

**섹션 구성**:

1. **헤더**: 동네 이름 대형 타이틀, 구/시 태그, 통근 시간 배지, 뒤로가기 버튼

2. **통근 경로 카드**: 세로 타임라인 (출발지 → 도착지), 이용 노선, 도어투도어 시간, 첫차/막차 (목업), 혼잡도 배지 (목업)

3. **비용 비교 테이블** (Anchoring Effect): 현재 거주지(서울 평균) vs 추천 동네 비교 — 월세, 교통비, 총 주거비, 절감액 강조, 연간 절감 예상액 하단 크게 표시

4. **생활 정보 탭** (교통/생활/안전): 각 탭에 아이콘 + 수치 + 등급 형태 목업 데이터

5. **매물 미리보기**: housing_listings에서 3개 가로 스크롤 카드 + "전체 매물 보기" 버튼 → /housing/:neighborhoodId

**하단 고정 CTA**: "비교하기" 버튼 (compareList에 추가, 최대 3개)

### 4. /compare 비용 비교 페이지

- compareList에서 2~3개 동네를 나란히 비교 테이블
- 비교 항목: 통근시간, 월세, 교통비, 총비용, 생활편의, 안전등급
- 각 항목 최적값 초록색 강조, 종합 추천 점수 (100점 만점, 목업 계산)
- 빈 상태: "결과 페이지에서 동네를 선택해주세요" + 이동 버튼

### 5. /housing/:neighborhoodId 매물 리스트 페이지

- **필터 바**: 보증금 범위 슬라이더, 월세 범위 슬라이더, 면적 필터 탭 (원룸/투룸/쓰리룸+)
- **매물 카드 리스트**: placeholder 이미지 + 보증금/월세 + 면적 + 층수 + 역 도보거리
- 카드 클릭 시 Dialog 모달 "곧 오픈 예정" 안내
- Supabase에서 neighborhood_id로 필터링 쿼리

### 6. 컴포넌트 구조

```text
src/pages/NeighborhoodPage.tsx        (전면 리뉴얼)
src/components/neighborhood/
  CommuteTimeline.tsx                 (통근 경로 타임라인)
  CostComparisonTable.tsx             (비용 비교 테이블)
  LivingInfoTabs.tsx                  (생활 정보 탭)
  HousingPreview.tsx                  (매물 미리보기)
  BottomCTA.tsx                       (하단 고정 바)

src/pages/ComparePage.tsx             (전면 리뉴얼)
src/pages/HousingPage.tsx             (전면 리뉴얼)
```

### 7. 구현 순서

1. DB migration (housing_listings) + 시드 데이터
2. Zustand compare store 확장
3. NeighborhoodPage 전면 구현 (5개 서브 컴포넌트)
4. ComparePage 구현
5. HousingPage 구현

