export interface SeedingEntry {
  seed_rank: number;
  name: string;
  club: string;
  seed_val: number;
  current_rank: number | null;
  previous_rank: number | null;
  is_seeded: boolean;
}

export interface SeedingOrder {
  year: number;
  generated_at: string;
  current_cup_url: string | null;
  previous_cup_url: string | null;
  classes: Record<string, SeedingEntry[]>;
}
