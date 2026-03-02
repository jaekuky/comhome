import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SortMode = "rank" | "commute" | "rent";

interface FilterTabsProps {
  value: SortMode;
  onChange: (v: SortMode) => void;
}

const FilterTabs = ({ value, onChange }: FilterTabsProps) => (
  <Tabs value={value} onValueChange={(v) => onChange(v as SortMode)}>
    <TabsList className="w-full">
      <TabsTrigger value="rank" className="flex-1 text-xs">추천순</TabsTrigger>
      <TabsTrigger value="commute" className="flex-1 text-xs">통근시간순</TabsTrigger>
      <TabsTrigger value="rent" className="flex-1 text-xs">월세순</TabsTrigger>
    </TabsList>
  </Tabs>
);

export default FilterTabs;
