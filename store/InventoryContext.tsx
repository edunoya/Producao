
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Flavor, Category, ProductionLog, StoreClosingLog, StoreName, UnitType } from '../types';
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
  distributeBuckets: (entry: DistributionEntry) => Promise<void>;
  saveStoreClosing: (store: StoreName, employee: string, closingBuckets: Bucket[]) => Promise<void>;
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
    const safetyTimeout = setTimeout(() => { if (isInitialLoad) setIsInitialLoad(false); }, 4000);
    if (!isFirebaseConfigured || !db) { setIsInitialLoad(false); return; }

    const docRef = doc(db, "inventory", "main");
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const toDate = (val: any) => val instanceof Timestamp ? val.toDate() : new Date(val || Date.now());
        
        // Proteção contra dados corrompidos ou nulos no Firestore
        if (data.buckets) setBuckets(data.buckets.map((b: any) => ({ ...b, producedAt: toDate(b.producedAt) })));
        if (data.flavors) setFlavors(data.flavors);
        if (data.categories) setCategories(data.categories);
        if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
        if (data.storeClosingLogs) setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
      }
      setIsInitialLoad(false);
      clearTimeout(safetyTimeout);
    }, (error) => {
      console.error("Firestore Error:", error);
      setIsInitialLoad(false);
    });

    return () => unsub();
  }, []);

  const persist = async (updates: any) => {
    if (!db) return false;
    setIsSyncing(true);
    try {
      await setDoc(doc(db, "inventory", "main"), { 
        ...updates, 
        lastUpdated: new Date().toISOString() 
      }, { merge: true });
      return true;
    } catch (e: any) {
      console.error("Erro ao persistir no banco:", e.message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const addProductionBatch = async (entries: ProductionEntry[], note: string, date: Date) => {
    const newBuckets: Bucket[] = [];
    const logEntries: any[] = [];
    const batchId = `BATCH-${Date.now()}`;
    
    entries.forEach(entry => {
      const flavor = flavorsMap[entry.flavorId];
      if (!flavor) return;

      let seq = buckets.filter(b => b.flavorId === entry.flavorId).length + 1;
      const validWeights = entry.weights.filter(w => w > 0);
      const totalGrams = validWeights.reduce((a, b) => a + b, 0);

      validWeights.forEach(w => {
        newBuckets.push({
          id: `${flavor.initials}-${Date.now().toString().slice(-4)}-${seq++}`,
          flavorId: entry.flavorId,
          grams: w,
          unitType: entry.unitType,
          producedAt: date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq,
          note: batchId
        });
      });

      if (validWeights.length > 0) {
        logEntries.push({ 
          flavorId: entry.flavorId, 
          totalGrams, 
          bucketCount: validWeights.length, 
          unitType: entry.unitType 
        });
      }
    });

    if (newBuckets.length > 0) {
      await persist({ 
        buckets: [...buckets, ...newBuckets], 
        productionLogs: [{ 
          id: batchId, 
          batchNote: note, 
          entries: logEntries, 
          date 
        } as ProductionLog, ...productionLogs] 
      });
    }
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updated = buckets.map(b => 
      entry.bucketIds.includes(b.id) 
        ? { ...b, location: entry.targetStore, status: 'estoque' as const } 
        : b
    );
    await persist({ buckets: updated });
  };

  const saveStoreClosing = async (store: StoreName, employee: string, closingBuckets: Bucket[]) => {
    const logItems: any[] = [];
    const updatedBuckets = buckets.map(b => {
      if (b.location === store && b.status === 'estoque') {
        const found = closingBuckets.find(cb => cb.id === b.id);
        
        // Se o balde não está na lista enviada, assumimos que foi vendido (0g)
        const currentGrams = found ? Number(found.grams) : 0;
        const soldGrams = b.grams - currentGrams;
        
        logItems.push({ 
          flavorId: b.flavorId, 
          grams: currentGrams, 
          unitType: b.unitType, 
          soldGrams: Math.max(0, soldGrams) 
        });

        if (currentGrams <= 0) {
          return { ...b, grams: 0, status: 'vendido' as const };
        }
        return { ...b, grams: currentGrams };
      }
      return b;
    });

    const totalKg = closingBuckets.reduce((a, b) => a + Number(b.grams), 0) / 1000;
    
    const log: StoreClosingLog = {
      id: `CLOSE-${Date.now()}`,
      storeName: store,
      employeeName: employee,
      date: new Date(),
      totalKg,
      items: logItems
    };

    await persist({ 
      buckets: updatedBuckets, 
      storeClosingLogs: [log, ...storeClosingLogs] 
    });
  };

  const markAsSold = async (id: string) => {
    await persist({ 
      buckets: buckets.map(b => b.id === id ? { ...b, status: 'vendido' as const, grams: 0 } : b) 
    });
  };

  const deleteBucket = async (id: string) => {
    await persist({ buckets: buckets.filter(b => b.id !== id) });
  };

  const updateBucketWeight = async (id: string, grams: number) => {
    await persist({ 
      buckets: buckets.map(b => b.id === id ? { ...b, grams: Math.max(0, grams) } : b) 
    });
  };

  const getSuggestedDistribution = useCallback((location: StoreName) => {
    return buckets
      .filter(b => b.location === location && b.status === 'estoque')
      .sort((a, b) => (flavorsMap[a.flavorId]?.name || '').localeCompare(flavorsMap[b.flavorId]?.name || ''));
  }, [buckets, flavorsMap]);

  const updateFlavor = async (f: Flavor) => {
    await persist({ flavors: flavors.map(old => old.id === f.id ? f : old) });
  };

  const addCategory = async (name: string) => {
    await persist({ categories: [...categories, { id: Date.now().toString(), name }] });
  };

  const resetDatabase = async () => {
    if (window.confirm("ATENÇÃO: Isso apagará TODOS os dados de estoque e produção. Continuar?")) {
      await persist({ 
        buckets: [], 
        productionLogs: [], 
        storeClosingLogs: [] 
      });
      window.location.reload();
    }
  };

  const exportToCSV = () => {
    const header = "Data,Unidade,Sabor,ID,Peso(g),Status\n";
    const rows = buckets.map(b => 
      `${b.producedAt.toLocaleDateString()},${b.location},${flavorsMap[b.flavorId]?.name},${b.id},${b.grams},${b.status}`
    ).join('\n');
    
    const blob = new Blob(["\uFEFF" + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `estoque_lorenza_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, flavorsMap, categories, productionLogs, storeClosingLogs, isSyncing, isInitialLoad,
      addProductionBatch, distributeBuckets, saveStoreClosing, 
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
