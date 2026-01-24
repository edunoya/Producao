
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Flavor, Category, ProductionLog, StoreClosingLog, StoreName } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { onSnapshot, setDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';

interface InventoryContextType {
  buckets: Bucket[];
  flavors: Flavor[];
  categories: Category[];
  productionLogs: ProductionLog[];
  storeClosingLogs: StoreClosingLog[];
  isSyncing: boolean;
  isInitialLoad: boolean;
  addProductionBatch: (entries: ProductionEntry[], note: string, date: Date) => Promise<void>;
  distributeBuckets: (entry: DistributionEntry) => Promise<void>;
  saveStoreClosing: (store: StoreName, closingBuckets: Bucket[]) => Promise<void>;
  markAsSold: (bucketId: string) => Promise<void>;
  deleteBucket: (id: string) => Promise<void>;
  updateFlavor: (f: Flavor) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  exportToCSV: () => void;
  resetDatabase: () => Promise<void>;
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

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setIsInitialLoad(false);
      return;
    }

    const docRef = doc(db, "inventory", "main");
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const toDate = (val: any) => val instanceof Timestamp ? val.toDate() : new Date(val || Date.now());

        setBuckets((data.buckets || []).map((b: any) => ({ ...b, producedAt: toDate(b.producedAt) })));
        if (data.flavors) setFlavors(data.flavors);
        if (data.categories) setCategories(data.categories);
        if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
        if (data.storeClosingLogs) setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
      }
      setIsInitialLoad(false);
    });

    return () => unsub();
  }, []);

  const persist = async (updates: any) => {
    if (!db) return false;
    setIsSyncing(true);
    try {
      await updateDoc(doc(db, "inventory", "main"), { ...updates, lastUpdated: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error("Erro persistência:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const addProductionBatch = async (entries: ProductionEntry[], note: string, date: Date) => {
    const newBuckets: Bucket[] = [];
    const logEntries: any[] = [];
    
    entries.forEach(entry => {
      const flavor = flavors.find(f => f.id === entry.flavorId);
      let seq = buckets.filter(b => b.flavorId === entry.flavorId).length + 1;
      
      entry.weights.forEach(w => {
        newBuckets.push({
          id: `${flavor?.initials || 'G'}-${Date.now().toString().slice(-4)}-${seq++}`,
          flavorId: entry.flavorId,
          grams: Number(w),
          producedAt: date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq
        });
      });

      logEntries.push({
        flavorId: entry.flavorId,
        totalGrams: entry.weights.reduce((a, b) => a + Number(b), 0),
        bucketCount: entry.weights.length
      });
    });

    const newLog: ProductionLog = {
      id: Math.random().toString(36).slice(2),
      batchNote: note,
      entries: logEntries,
      date: date
    };

    await persist({ 
      buckets: [...buckets, ...newBuckets], 
      productionLogs: [newLog, ...productionLogs] 
    });
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updated = buckets.map(b => 
      entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b
    );
    await persist({ buckets: updated });
  };

  const markAsSold = async (bucketId: string) => {
    const updated = buckets.map(b => b.id === bucketId ? { ...b, status: 'vendido' as const } : b);
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

    const log: StoreClosingLog = {
      id: Math.random().toString(36).slice(2),
      storeName: store,
      date: new Date(),
      totalKg: closingBuckets.reduce((a, b) => a + Number(b.grams), 0) / 1000,
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
    if (!window.confirm("Zerar tudo?")) return;
    await persist({ buckets: [], productionLogs: [], storeClosingLogs: [], flavors: INITIAL_FLAVORS, categories: INITIAL_CATEGORIES });
  };

  const exportToCSV = () => {
    let csv = "Data,Lote,Sabor,Grams,Volumes\n";
    productionLogs.forEach(l => {
      l.entries.forEach(e => {
        csv += `${l.date.toLocaleDateString()},${l.batchNote || ''},${flavors.find(f => f.id === e.flavorId)?.name},${e.totalGrams},${e.bucketCount}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Lorenza_Relatorio.csv`; a.click();
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, storeClosingLogs, isSyncing, isInitialLoad,
      addProductionBatch, distributeBuckets, saveStoreClosing, markAsSold, deleteBucket, updateFlavor, addCategory, 
      exportToCSV, resetDatabase
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
