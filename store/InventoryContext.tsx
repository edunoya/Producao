
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  addProduction: (entries: ProductionEntry[], date: Date) => Promise<void>;
  distributeBuckets: (entry: DistributionEntry) => Promise<void>;
  saveStoreClosing: (store: StoreName, closingBuckets: Bucket[]) => Promise<void>;
  deleteBucket: (id: string) => Promise<void>;
  updateFlavor: (f: Flavor) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
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
        const toDate = (val: any) => {
          if (!val) return new Date();
          if (val instanceof Timestamp) return val.toDate();
          return new Date(val);
        };

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
      const docRef = doc(db, "inventory", "main");
      await updateDoc(docRef, { ...updates, lastUpdated: new Date().toISOString() });
      return true;
    } catch (e) {
      console.error("Erro persistência:", e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const addProduction = async (entries: ProductionEntry[], date: Date) => {
    const newBuckets: Bucket[] = [];
    const newLogs: ProductionLog[] = [];
    
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
      newLogs.push({
        id: Math.random().toString(36).slice(2),
        flavorId: entry.flavorId,
        totalGrams: entry.weights.reduce((a, b) => a + Number(b), 0),
        bucketCount: entry.weights.length,
        date: date
      });
    });

    await persist({ 
      buckets: [...buckets, ...newBuckets], 
      productionLogs: [...newLogs, ...productionLogs] 
    });
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    // Busca o estado mais atualizado antes de enviar
    const updated = buckets.map(b => 
      entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b
    );
    const success = await persist({ buckets: updated });
    if (!success) throw new Error("Erro ao distribuir");
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

  const deleteCategory = async (id: string) => {
    await persist({ categories: categories.filter(c => c.id !== id) });
  };

  const resetDatabase = async () => {
    if (!window.confirm("Deseja zerar tudo?")) return;
    await persist({ buckets: [], productionLogs: [], storeClosingLogs: [], flavors: INITIAL_FLAVORS, categories: INITIAL_CATEGORIES });
  };

  const exportToCSV = () => {
    let csv = "Data,Evento,Loja,Sabor,Valor\n";
    productionLogs.forEach(l => csv += `${l.date.toLocaleDateString()},Producao,Fabrica,${flavors.find(fl => fl.id === l.flavorId)?.name},${l.totalGrams}g\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Lorenza_${Date.now()}.csv`; a.click();
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, storeClosingLogs, isSyncing, isInitialLoad,
      addProduction, distributeBuckets, saveStoreClosing, deleteBucket, updateFlavor, addCategory, 
      deleteCategory, exportToCSV, resetDatabase
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory missing provider');
  return ctx;
};
