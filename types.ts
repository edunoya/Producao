
export type StoreName = 'Fábrica' | 'Campo Duna' | 'Casa Kimo' | 'Rosa';

export interface Category {
  id: string;
  name: string;
}

export interface Flavor {
  id: string;
  name: string;
  initials: string;
  categoryIds: string[];
  description?: string;
  isActive: boolean;
}

export interface Bucket {
  id: string;
  flavorId: string;
  grams: number;
  producedAt: Date;
  note?: string;
  location: StoreName;
  status: 'estoque' | 'vendido' | 'distribuido';
  sequence: number;
}

export interface ProductionLog {
  id: string;
  batchNote?: string;
  entries: {
    flavorId: string;
    totalGrams: number;
    bucketCount: number;
  }[];
  date: Date;
}

export interface StoreClosingLog {
  id: string;
  storeName: StoreName;
  date: Date;
  totalKg: number;
  items: {
    flavorId: string;
    grams: number;
  }[];
}

export interface ProductionEntry {
  flavorId: string;
  weights: number[];
}

export interface DistributionEntry {
  targetStore: StoreName;
  bucketIds: string[];
}
