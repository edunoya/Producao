
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Notification, StoreName, Flavor, Category, ProductionLog, StoreClosingLog } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { onSnapshot, setDoc, doc, updateDoc } from 'firebase/firestore';

interface InventoryContextType {
  buckets: Bucket[];
  flavors: Flavor[];
  categories: Category[];
  productionLogs: ProductionLog[];
  storeClosingLogs: StoreClosingLog[];
  notifications: Notification[];
  isSyncing: boolean;
  isInitialLoad: boolean;
  addProduction: (entries: ProductionEntry[], productionDate: Date) => void;
  distributeBuckets: (entry: DistributionEntry) => void;
  saveStoreClosing: (storeName: StoreName, closingBuckets: Bucket[]) => void;
  deleteBucket: (id: string) => void;
  updateFlavor: (flavor: Flavor) => void;
  addCategory: (name: string) => void;
  deleteCategory: (id: string) => void;
  exportToCSV: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [storeClosingLogs, setStoreClosingLogs] = useState<StoreClosingLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Listener em tempo real do Firebase
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const unsubBuckets = onSnapshot(doc(db, "inventory", "main"), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const mappedBuckets = (data.buckets || []).map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) }));
          setBuckets(mappedBuckets);
          if (data.flavors) setFlavors(data.flavors);
          if (data.categories) setCategories(data.categories);
          if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
          if (data.storeClosingLogs) setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
        }
        setIsInitialLoad(false);
      });
      return () => unsubBuckets();
    } else {
      setIsInitialLoad(false);
    }
  }, []);

  const persist = useCallback(async (updates: any) => {
    if (!isFirebaseConfigured || !db) return;
    setIsSyncing(true);
    try {
      await updateDoc(doc(db, "inventory", "main"), {
        ...updates,
        lastUpdated: new Date().toISOString()
      });
    } catch (e) {
      // Se o documento não existir, cria ele
      await setDoc(doc(db, "inventory", "main"), {
        buckets, flavors, categories, productionLogs, storeClosingLogs,
        ...updates,
        lastUpdated: new Date().toISOString()
      });
    }
    setIsSyncing(false);
  }, [buckets, flavors, categories, productionLogs, storeClosingLogs]);

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

    const updatedBuckets = [...buckets, ...newBuckets];
    const updatedLogs = [...newLogs, ...productionLogs];
    await persist({ buckets: updatedBuckets, productionLogs: updatedLogs });
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
    const updated = buckets.filter(b => b.id !== id);
    await persist({ buckets: updated });
  };

  const updateFlavor = async (f: Flavor) => {
    const updated = flavors.map(old => old.id === f.id ? f : old);
    await persist({ flavors: updated });
  };

  const addCategory = async (name: string) => {
    const updated = [...categories, { id: Date.now().toString(), name }];
    await persist({ categories: updated });
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    await persist({ categories: updated });
  };

  const exportToCSV = () => {
    let csv = "Data,Evento,Detalhe,Valor\n";
    productionLogs.forEach(l => csv += `${l.date.toLocaleDateString()},Produção,${flavors.find(f=>f.id===l.flavorId)?.name},${l.totalGrams}g\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Relatorio_Lorenza.csv";
    a.click();
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, storeClosingLogs, notifications, 
      isSyncing, isInitialLoad, addProduction, distributeBuckets, saveStoreClosing,
      deleteBucket, updateFlavor, addCategory, deleteCategory, exportToCSV
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory deve ser usado com InventoryProvider');
  return ctx;
};
