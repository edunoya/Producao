
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
  updateProductionBatch: (id: string, entries: ProductionEntry[], note: string) => Promise<void>;
  deleteProductionBatch: (id: string) => Promise<void>;
  distributeBuckets: (entry: DistributionEntry) => Promise<void>;
  saveStoreClosing: (store: StoreName, employee: string, closingBuckets: Bucket[]) => Promise<void>;
  markAsSold: (bucketId: string) => Promise<void>;
  deleteBucket: (id: string) => Promise<void>;
  updateBucketWeight: (id: string, grams: number) => Promise<void>;
  updateFlavor: (f: Flavor) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
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
    const safetyTimeout = setTimeout(() => { if (isInitialLoad) setIsInitialLoad(false); }, 3000);
    if (!isFirebaseConfigured || !db) { setIsInitialLoad(false); return; }

    const docRef = doc(db, "inventory", "main");
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
    });
    return () => { unsub(); clearTimeout(safetyTimeout); };
  }, []);

  const persist = async (updates: any) => {
    if (!db) return false;
    setIsSyncing(true);
    try {
      await setDoc(doc(db, "inventory", "main"), { ...updates, lastUpdated: new Date().toISOString() }, { merge: true });
      return true;
    } catch (e: any) { return false; } finally { setIsSyncing(false); }
  };

  const getSuggestedDistribution = useCallback((location: StoreName) => {
    return buckets.filter(b => b.location === location && b.status === 'estoque')
      .sort((a, b) => (flavorsMap[a.flavorId]?.name || '').localeCompare(flavorsMap[b.flavorId]?.name || ''));
  }, [buckets, flavorsMap]);

  const addProductionBatch = async (entries: ProductionEntry[], note: string, date: Date) => {
    const newBuckets: Bucket[] = [];
    const logEntries: any[] = [];
    const batchId = Math.random().toString(36).slice(2);
    
    entries.forEach(entry => {
      const flavor = flavorsMap[entry.flavorId];
      let seq = buckets.filter(b => b.flavorId === entry.flavorId).length + 1;
      const totalGrams = entry.weights.reduce((a, b) => a + Number(b), 0);

      entry.weights.forEach(w => {
        newBuckets.push({
          id: `${flavor?.initials || 'G'}-${Date.now().toString().slice(-4)}-${seq++}`,
          flavorId: entry.flavorId,
          grams: Number(w),
          unitType: entry.unitType,
          producedAt: date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq,
          note: batchId
        });
      });
      logEntries.push({ flavorId: entry.flavorId, totalGrams, bucketCount: entry.weights.length, unitType: entry.unitType });
    });

    await persist({ 
      buckets: [...buckets, ...newBuckets], 
      productionLogs: [{ id: batchId, batchNote: note, entries: logEntries, date } as ProductionLog, ...productionLogs] 
    });
  };

  // Add missing updateProductionBatch fix
  const updateProductionBatch = async (id: string, entries: ProductionEntry[], note: string) => {
    const updatedLogs = productionLogs.map(log => 
      log.id === id ? { 
        ...log, 
        batchNote: note, 
        entries: entries.map(e => ({
          flavorId: e.flavorId,
          totalGrams: e.weights.reduce((a, b) => a + Number(b), 0),
          bucketCount: e.weights.length,
          unitType: e.unitType
        })) 
      } : log
    );
    await persist({ productionLogs: updatedLogs });
  };

  // Add missing deleteProductionBatch fix
  const deleteProductionBatch = async (id: string) => {
    const updatedLogs = productionLogs.filter(log => log.id !== id);
    const updatedBuckets = buckets.filter(b => b.note !== id);
    await persist({ productionLogs: updatedLogs, buckets: updatedBuckets });
  };

  const saveStoreClosing = async (store: StoreName, employee: string, closingBuckets: Bucket[]) => {
    const logItems: any[] = [];
    const updatedBuckets = buckets.map(b => {
      if (b.location === store && b.status === 'estoque') {
        const found = closingBuckets.find(cb => cb.id === b.id);
        const soldGrams = b.grams - (found ? found.grams : 0);
        logItems.push({ flavorId: b.flavorId, grams: found?.grams || 0, unitType: b.unitType, soldGrams });
        return found ? { ...b, grams: Number(found.grams) } : { ...b, status: 'vendido' as const };
      }
      return b;
    });

    const totalKg = closingBuckets.reduce((a, b) => a + Number(b.grams), 0) / 1000;
    const log: StoreClosingLog = {
      id: Math.random().toString(36).slice(2),
      storeName: store,
      employeeName: employee,
      date: new Date(),
      totalKg,
      items: logItems
    };

    await persist({ buckets: updatedBuckets, storeClosingLogs: [log, ...storeClosingLogs] });
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updated = buckets.map(b => entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b);
    await persist({ buckets: updated });
  };

  const markAsSold = async (id: string) => { await persist({ buckets: buckets.map(b => b.id === id ? { ...b, status: 'vendido' as const } : b) }); };
  const updateBucketWeight = async (id: string, grams: number) => { await persist({ buckets: buckets.map(b => b.id === id ? { ...b, grams: Number(grams) } : b) }); };
  const deleteBucket = async (id: string) => { await persist({ buckets: buckets.filter(b => b.id !== id) }); };
  const updateFlavor = async (f: Flavor) => { await persist({ flavors: flavors.map(old => old.id === f.id ? f : old) }); };
  const addCategory = async (name: string) => { await persist({ categories: [...categories, { id: Date.now().toString(), name }] }); };
  
  // Add missing updateCategory fix
  const updateCategory = async (c: Category) => {
    await persist({ categories: categories.map(old => old.id === c.id ? c : old) });
  };

  // Add missing deleteCategory fix
  const deleteCategory = async (id: string) => {
    await persist({ categories: categories.filter(c => c.id !== id) });
  };

  const resetDatabase = async () => { if (window.confirm("Zerar banco?")) await persist({ buckets: [], productionLogs: [], storeClosingLogs: [] }); };

  const exportToCSV = () => {
    const header = "Data,Unidade,Sabor,Tipo,Massa(g),Status\n";
    const rows = buckets.map(b => `${b.producedAt.toLocaleDateString()},${b.location},${flavorsMap[b.flavorId]?.name},${b.unitType},${b.grams},${b.status}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'estoque_lorenza.csv'; a.click();
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, flavorsMap, categories, productionLogs, storeClosingLogs, isSyncing, isInitialLoad,
      addProductionBatch, updateProductionBatch, deleteProductionBatch, distributeBuckets, saveStoreClosing, 
      markAsSold, deleteBucket, updateBucketWeight, updateFlavor, addCategory, updateCategory, deleteCategory,
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
