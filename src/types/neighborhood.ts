export interface NeighborhoodResult {
  id: string;
  name: string;
  district: string;
  city: string;
  avg_rent: number;
  commute_minutes: number;
  commute_route?: string;
  savings_amount: number;
  rank: number;
  latitude?: number | null;
  longitude?: number | null;
}
