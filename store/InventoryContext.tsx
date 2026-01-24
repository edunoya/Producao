
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Flavor, Category, ProductionLog, StoreClosingLog, StoreName } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { onSnapshot, setDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

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

  // Inicializa ou Escuta o Firebase
  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setIsInitialLoad(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "inventory", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBuckets((data.buckets || []).map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) })));
        if (data.flavors) setFlavors(data.flavors);
        if (data.categories) setCategories(data.categories);
        if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
        if (data.storeClosingLogs) setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
      } else {
        // Inicializa documento se não existir
        setDoc(doc(db, "inventory", "main"), {
          buckets: [],
          flavors: INITIAL_FLAVORS,
          categories: INITIAL_CATEGORIES,
          productionLogs: [],
          storeClosingLogs: [],
          lastUpdated: new Date().toISOString()
        });
      }
      setIsInitialLoad(false);
    }, (error) => {
      console.error("Erro no Listener Firebase:", error);
      setIsInitialLoad(false);
    });

    return () => unsub();
  }, []);

  const persist = async (updates: any) => {
    if (!db) return;
    setIsSyncing(true);
    try {
      await updateDoc(doc(db, "inventory", "main"), {
        ...updates,
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      console.error("Falha ao persistir:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetDatabase = async () => {
    if (!window.confirm("Isso apagará TODO o estoque e logs. Confirmar?")) return;
    await persist({
      buckets: [],
      productionLogs: [],
      storeClosingLogs: [],
      flavors: INITIAL_FLAVORS,
      categories: INITIAL_CATEGORIES
    });
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
          grams: w,
          producedAt: date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq
        });
      });

      newLogs.push({
        id: Math.random().toString(36).slice(2),
        flavorId: entry.flavorId,
        totalGrams: entry.weights.reduce((a, b) => a + b, 0),
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
    const updated = buckets.map(b => 
      entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b
    );
    await persist({ buckets: updated });
  };

  const saveStoreClosing = async (store: StoreName, closingBuckets: Bucket[]) => {
    const updated = buckets.map(b => {
      if (b.location === store && b.status === 'estoque') {
        const found = closingBuckets.find(cb => cb.id === b.id);
        return found ? { ...b, grams: found.grams } : { ...b, status: 'vendido' as const };
      }
      return b;
    });

    const log: StoreClosingLog = {
      id: Math.random().toString(36).slice(2),
      storeName: store,
      date: new Date(),
      totalKg: closingBuckets.reduce((a, b) => a + b.grams, 0) / 1000,
      items: closingBuckets.map(b => ({ flavorId: b.flavorId, grams: b.grams }))
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

  const exportToCSV = () => {
    let csv = "Data,Evento,Loja,Sabor,Valor\n";
    productionLogs.forEach(l => {
      const f = flavors.find(fl => fl.id === l.flavorId)?.name;
      csv += `${l.date.toLocaleDateString()},Producao,Fabrica,${f},${l.totalGrams}g\n`;
    });
    storeClosingLogs.forEach(l => {
      csv += `${l.date.toLocaleDateString()},Fechamento,${l.storeName},Total,${l.totalKg}kg\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Controle_Lorenza_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
};
