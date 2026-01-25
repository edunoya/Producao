
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Flavor, Category, ProductionLog, StoreClosingLog, StoreName } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { onSnapshot, doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';

interface InventoryContextType {
  buckets: Bucket[];
  flavors: Flavor[];
  flavorsMap: Record<string, Flavor>;
  categories: Category[];
  productionLogs: ProductionLog[];
  storeClosingLogs: StoreClosingLog[];
  isSyncing: boolean;
  isInitialLoad: boolean;
  addProductionBatch: (entries: ProductionEntry[], note: string, date: Date) => Promise<void>;
  updateProductionBatch: (id: string, entries: ProductionEntry[], note: string) => Promise<void>;
  deleteProductionBatch: (id: string) => Promise<void>;
  distributeBuckets: (entry: DistributionEntry) => Promise<void>;
  saveStoreClosing: (store: StoreName, closingBuckets: Bucket[]) => Promise<void>;
  markAsSold: (bucketId: string) => Promise<void>;
  deleteBucket: (id: string) => Promise<void>;
  updateBucketWeight: (id: string, grams: number) => Promise<void>;
  updateFlavor: (f: Flavor) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  exportToCSV: () => void;
  resetDatabase: () => Promise<void>;
  getSuggestedDistribution: (location: StoreName) => Bucket[];
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [storeClosingLogs, setStoreClosingLogs] = useState<StoreClosingLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const flavorsMap = useMemo(() => {
    return flavors.reduce((acc, f) => ({ ...acc, [f.id]: f }), {} as Record<string, Flavor>);
  }, [flavors]);

  useEffect(() => {
    // Safety timeout: If Firebase doesn't respond in 6s, allow app to render anyway
    const safetyTimeout = setTimeout(() => {
      if (isInitialLoad) {
        console.warn("Safety timeout: Firebase demorou demais. Carregando interface...");
        setIsInitialLoad(false);
      }
    }, 6000);

    if (!isFirebaseConfigured || !db) {
      console.warn("Firebase não configurado ou offline. Usando dados locais.");
      setIsInitialLoad(false);
      clearTimeout(safetyTimeout);
      return;
    }

    const docRef = doc(db, "inventory", "main");
    
    const initializeDb = async () => {
      try {
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          await setDoc(docRef, {
            buckets: [],
            flavors: INITIAL_FLAVORS,
            categories: INITIAL_CATEGORIES,
            productionLogs: [],
            storeClosingLogs: [],
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error("Erro ao verificar Firestore:", e);
      }
    };

    initializeDb();

    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const toDate = (val: any) => val instanceof Timestamp ? val.toDate() : new Date(val || Date.now());

        if (data.buckets) setBuckets(data.buckets.map((b: any) => ({ ...b, producedAt: toDate(b.producedAt) })));
        if (data.flavors) setFlavors(data.flavors);
        if (data.categories) setCategories(data.categories);
        if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
        if (data.storeClosingLogs) setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
      }
      setIsInitialLoad(false);
      clearTimeout(safetyTimeout);
    }, (error) => {
      console.error("Firebase Snapshot Error:", error.message);
      setIsInitialLoad(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      unsub();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const persist = async (updates: any) => {
    if (!db) return false;
    setIsSyncing(true);
    try {
      await setDoc(doc(db, "inventory", "main"), { ...updates, lastUpdated: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e: any) {
      console.error("Persistence Error:", e.message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const getSuggestedDistribution = useCallback((location: StoreName) => {
    const locBuckets = buckets.filter(b => b.location === location && b.status === 'estoque');
    const stockSummary: Record<string, number> = {};
    locBuckets.forEach(b => {
      stockSummary[b.flavorId] = (stockSummary[b.flavorId] || 0) + b.grams;
    });

    return [...locBuckets].sort((a, b) => {
      const stockA = stockSummary[a.flavorId] || 0;
      const stockB = stockSummary[b.flavorId] || 0;
      if (stockB !== stockA) return stockB - stockA;
      const nameA = flavorsMap[a.flavorId]?.name || '';
      const nameB = flavorsMap[b.flavorId]?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [buckets, flavorsMap]);

  const addProductionBatch = async (entries: ProductionEntry[], note: string, date: Date) => {
    const newBuckets: Bucket[] = [];
    const logEntries: any[] = [];
    const batchId = Math.random().toString(36).slice(2);
    
    entries.forEach(entry => {
      const flavor = flavorsMap[entry.flavorId];
      let seq = buckets.filter(b => b.flavorId === entry.flavorId).length + 1;
      const totalGrams = entry.weights.reduce((a, b) => Math.round((a + Number(b)) * 100) / 100, 0);

      entry.weights.forEach(w => {
        newBuckets.push({
          id: `${flavor?.initials || 'G'}-${Date.now().toString().slice(-4)}-${seq++}`,
          flavorId: entry.flavorId,
          grams: Number(w),
          producedAt: date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq,
          note: batchId
        });
      });

      logEntries.push({ flavorId: entry.flavorId, totalGrams, bucketCount: entry.weights.length });
    });

    await persist({ 
      buckets: [...buckets, ...newBuckets], 
      productionLogs: [{ id: batchId, batchNote: note, entries: logEntries, date } as ProductionLog, ...productionLogs] 
    });
  };

  const updateProductionBatch = async (id: string, entries: ProductionEntry[], note: string) => {
    const filteredBuckets = buckets.filter(b => b.note !== id);
    const log = productionLogs.find(l => l.id === id);
    if (!log) return;

    const newBuckets: Bucket[] = [];
    const logEntries: any[] = [];
    
    entries.forEach(entry => {
      const flavor = flavorsMap[entry.flavorId];
      let seq = filteredBuckets.filter(b => b.flavorId === entry.flavorId).length + 1;
      const totalGrams = entry.weights.reduce((a, b) => Math.round((a + Number(b)) * 100) / 100, 0);

      entry.weights.forEach(w => {
        newBuckets.push({
          id: `${flavor?.initials || 'G'}-${Date.now().toString().slice(-4)}-${seq++}`,
          flavorId: entry.flavorId,
          grams: Number(w),
          producedAt: log.date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq,
          note: id
        });
      });

      logEntries.push({ flavorId: entry.flavorId, totalGrams, bucketCount: entry.weights.length });
    });

    await persist({
      buckets: [...filteredBuckets, ...newBuckets],
      productionLogs: productionLogs.map(l => l.id === id ? { ...l, batchNote: note, entries: logEntries } : l)
    });
  };

  const deleteProductionBatch = async (id: string) => {
    if (!window.confirm("Deseja excluir este lote?")) return;
    await persist({ 
      buckets: buckets.filter(b => b.note !== id), 
      productionLogs: productionLogs.filter(l => l.id !== id) 
    });
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updated = buckets.map(b => entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b);
    await persist({ buckets: updated });
  };

  const markAsSold = async (bucketId: string) => {
    const updated = buckets.map(b => b.id === bucketId ? { ...b, status: 'vendido' as const } : b);
    await persist({ buckets: updated });
  };

  const updateBucketWeight = async (id: string, grams: number) => {
    const updated = buckets.map(b => b.id === id ? { ...b, grams: Number(grams) } : b);
    await persist({ buckets: updated });
  };

  const saveStoreClosing = async (store: StoreName, closingBuckets: Bucket[]) => {
    const updated = buckets.map(b => {
      if (b.location === store && b.status === 'estoque') {
        const found = closingBuckets.find(cb => cb.id === b.id);
        return found ? { ...b, grams: Number(found.grams) } : { ...b, status: 'vendido' as const };
      }
      return b;
    });

    const totalKg = closingBuckets.reduce((a, b) => Math.round((a + Number(b.grams)) * 100) / 100, 0) / 1000;
    const log: StoreClosingLog = {
      id: Math.random().toString(36).slice(2),
      storeName: store,
      date: new Date(),
      totalKg,
      items: closingBuckets.map(b => ({ flavorId: b.flavorId, grams: Number(b.grams) }))
    };

    await persist({ buckets: updated, storeClosingLogs: [log, ...storeClosingLogs] });
  };

  const deleteBucket = async (id: string) => {
    await persist({ buckets: buckets.filter(b => b.id !== id) });
  };

  const updateFlavor = async (f: Flavor) => {
    await persist({ flavors: flavors.map(old => old.id === f.id ? f : old) });
  };

  const addCategory = async (name: string) => {
    await persist({ categories: [...categories, { id: Date.now().toString(), name }] });
  };

  const resetDatabase = async () => {
    if (!window.confirm("Zerar banco de dados?")) return;
    await persist({ buckets: [], productionLogs: [], storeClosingLogs: [], flavors: INITIAL_FLAVORS, categories: INITIAL_CATEGORIES });
  };

  const exportToCSV = () => {
    const header = "\uFEFFData Produção,Lote/Nota,Sabor Gelato,Massa Total (kg),Volumes (Unidades)\n";
    const rows = productionLogs.flatMap(l => 
      l.entries.map(e => {
        const flavorName = flavorsMap[e.flavorId]?.name || "Desconhecido";
        const massKg = (e.totalGrams / 1000).toFixed(3).replace('.', ',');
        return `${l.date.toLocaleDateString('pt-BR')},"${l.batchNote || ''}","${flavorName}",${massKg},${e.bucketCount}`;
      })
    ).join('\n');

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lorenza_Export_${new Date().getTime()}.csv`;
    a.click();
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, flavorsMap, categories, productionLogs, storeClosingLogs, isSyncing, isInitialLoad,
      addProductionBatch, updateProductionBatch, deleteProductionBatch, distributeBuckets, saveStoreClosing, 
      markAsSold, deleteBucket, updateBucketWeight, updateFlavor, addCategory, 
      exportToCSV, resetDatabase, getSuggestedDistribution
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('InventoryProvider missing');
  return ctx;
};
