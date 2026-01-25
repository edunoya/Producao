
export type StoreName = 'Fábrica' | 'Campo Duna' | 'Casa Kimo' | 'Rosa';
export type UnitType = 'Balde' | 'TakeAway 240ml';

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
  unitType: UnitType; // Diferenciação solicitada entre baldes e unidades menores
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
    unitType: UnitType;
  }[];
  date: Date;
}

export interface StoreClosingLog {
  id: string;
  storeName: StoreName;
  employeeName: string; // Registro do funcionário solicitado
  date: Date;
  totalKg: number;
  items: {
    flavorId: string;
    grams: number;
    unitType: UnitType;
    soldGrams: number; // Cálculo da diferença de venda
  }[];
}

export interface ProductionEntry {
  flavorId: string;
  unitType: UnitType;
  weights: number[];
}

export interface DistributionEntry {
  targetStore: StoreName;
  bucketIds: string[];
}
