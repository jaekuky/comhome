import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Check, ArrowLeft, MapPin, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSearchStore, type Company } from "@/stores/searchStore";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import OnboardingTooltip from "@/components/OnboardingTooltip";

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [hasTyped, setHasTyped] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const {
    selectedCompany,
    setSelectedCompany,
    recentSearches,
    addRecentSearch,
    loadRecentSearches,
  } = useSearchStore();

  useEffect(() => {
    loadRecentSearches();
    inputRef.current?.focus();
    document.title = "회사 검색 | ComHome";
  }, [loadRecentSearches]);

  const searchCompanies = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("companies")
        .select("*")
        .or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`)
        .limit(5);

      if (dbError) throw dbError;
      setResults((data as Company[]) || []);
    } catch (err: any) {
      if (err?.message?.includes("fetch") || err?.message?.includes("network")) {
        setError("network");
      } else {
        setError("unknown");
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => searchCompanies(query), 300);
    } else {
      setResults([]);
    }
    if (selectedCompany && query !== selectedCompany.name) {
      setSelectedCompany(null);
      setConfirmedId(null);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchCompanies, selectedCompany, setSelectedCompany]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIndex(-1);
    if (!hasTyped && val.length === 1) {
      setHasTyped(true);
      trackEvent("search_start");
    }
  };

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company);
    setQuery(company.name);
    setResults([]);
    setConfirmedId(company.id);
    trackEvent("company_selected", { company_id: company.id, company_name: company.name });

    if (!company.district.match(/(구|시|군)$/)) {
      toast({
        title: "서비스 지역 안내",
        description: "현재 서울/경기 지역만 지원합니다",
        variant: "destructive",
      });
      return;
    }

    addRecentSearch(company);
  };

  const handleAnalyze = () => {
    if (!selectedCompany) return;
    trackEvent("analysis_triggered", { company_id: selectedCompany.id });
    navigate("/result", { state: { company: selectedCompany } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelectCompany(results[activeIndex]);
    }
  };

  const showDropdown = isFocused && query.length >= 2 && !selectedCompany;
  const showRecentSearches = isFocused && query.length === 0 && recentSearches.length > 0 && !selectedCompany;

  return (
    <div className="min-h-screen bg-background animate-slide-up">
      <div className="mobile-container py-6 space-y-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            어디로 출근하세요?
          </h1>
          <p className="text-sm text-muted-foreground">
            회사 이름이나 주소를 입력해주세요
          </p>
        </div>

        {/* Search input */}
        <div className="relative">
          {/* Onboarding tooltip */}
          {!hasTyped && !selectedCompany && (
            <OnboardingTooltip
              id="search_input"
              text="회사 이름을 입력해보세요! 🏢"
              position="top"
              onDismiss={() => setHasTyped(true)}
            />
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showDropdown}
              aria-haspopup="listbox"
              aria-controls="company-listbox"
              aria-activedescendant={activeIndex >= 0 ? `company-option-${activeIndex}` : undefined}
              aria-label="회사 검색"
              placeholder="예: 삼성전자, 강남역 근처..."
              value={query}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onKeyDown={handleKeyDown}
              className={`w-full h-14 rounded-[24px] border bg-card pl-12 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition-all duration-300 ${
                isFocused
                  ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                  : query.length === 0
                    ? "border-input animate-breathing"
                    : "border-input"
              }`}
            />
            {/* Confidence tick */}
            {confirmedId && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-pop-in">
                <div className="flex h-6 w-6 items-center justify-center rounded-full gradient-primary">
                  <Check className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <div
              id="company-listbox"
              role="listbox"
              aria-label="검색 결과"
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-border bg-card shadow-card-hover overflow-hidden animate-fade-up"
            >
              {loading && (
                <div className="flex items-center justify-center py-6" role="status" aria-label="검색 중">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {!loading && error === "network" && (
                <div className="p-5 text-center space-y-3">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                  <p className="text-sm text-foreground">일시적인 오류가 발생했습니다</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => searchCompanies(query)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    다시 시도
                  </Button>
                </div>
              )}

              {!loading && !error && results.length === 0 && query.length >= 2 && (
                <div className="p-5 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    찾으시는 회사가 없나요?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const directCompany: Company = {
                        id: "direct-" + Date.now(),
                        name: query,
                        address: query,
                        district: "직접입력",
                        latitude: null,
                        longitude: null,
                      };
                      handleSelectCompany(directCompany);
                    }}
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    주소를 직접 입력
                  </Button>
                </div>
              )}

              {!loading && !error && results.map((company, idx) => (
                <button
                  key={company.id}
                  id={`company-option-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  onClick={() => handleSelectCompany(company)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 ${
                    idx === activeIndex ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {company.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {company.address}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent searches */}
          {showRecentSearches && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-border bg-card shadow-card-hover overflow-hidden animate-fade-up">
              <div className="px-4 py-2 border-b border-border">
                <p className="text-xs font-medium text-muted-foreground">최근 검색</p>
              </div>
              {recentSearches.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0"
                >
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {company.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {company.address}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected company confirmation */}
        {selectedCompany && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full gradient-primary transition-all duration-500 ${confirmedId ? "scale-100" : "scale-0"}`}>
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {selectedCompany.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedCompany.address}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analyze button */}
        <Button
          variant="hero"
          size="xl"
          className="w-full"
          disabled={!selectedCompany}
          onClick={handleAnalyze}
          aria-label={selectedCompany ? `${selectedCompany.name} 기준 통근 분석 시작` : "회사를 선택해주세요"}
        >
          {selectedCompany
            ? `🔍 ${selectedCompany.name} 기준 통근 분석 시작`
            : "회사를 선택해주세요"}
        </Button>
      </div>
    </div>
  );
};

export default SearchPage;
