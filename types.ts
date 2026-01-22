
export type StoreName = 'Fábrica' | 'Campo Duna' | 'Casa Kimo' | 'Rosa';

export interface Category {
  id: string;
  name: string;
}

export interface Flavor {
  id: string;
  name: string;
  initials: string;
  categoryId: string;
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
  flavorId: string;
  totalGrams: number;
  bucketCount: number;
  date: Date;
  note?: string;
}

export interface ProductionEntry {
  flavorId: string;
  weights: number[];
  note: string;
}

export interface DistributionEntry {
  targetStore: StoreName;
  bucketIds: string[];
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  timestamp: Date;
}
