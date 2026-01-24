
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Notification, StoreName, Flavor, Category, ProductionLog, StoreClosingLog } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc
} from 'firebase/firestore';

interface InventoryContextType {
  buckets: Bucket[];
  flavors: Flavor[];
  categories: Category[];
  productionLogs: ProductionLog[];
  storeClosingLogs: StoreClosingLog[];
  notifications: Notification[];
  isSyncing: boolean;
  isInitialLoad: boolean;
  isLocalMode: boolean;
  addProduction: (entries: ProductionEntry[], productionDate: Date) => void;
  distributeBuckets: (entry: DistributionEntry) => void;
  updateBucket: (bucket: Bucket) => void;
  deleteBucket: (id: string) => void;
  updateFlavor: (flavor: Flavor) => void;
  addCategory: (name: string) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  saveStoreClosing: (storeName: StoreName, closingBuckets: Bucket[]) => void;
  dismissNotification: (id: string) => void;
  exportData: () => void;
  importData: (jsonData: string) => void;
  exportToCSV: () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const STORAGE_KEY_BUCKETS = 'lorenza_buckets_v3';

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [storeClosingLogs, setStoreClosingLogs] = useState<StoreClosingLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 1. ESCUTA EM TEMPO REAL (FIREBASE)
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const unsubBuckets = onSnapshot(doc(db, "inventory", "all_buckets"), (docSnap) => {
        if (docSnap.exists()) {
          const items = docSnap.data().items || [];
          const mapped = items.map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) }));
          setBuckets(mapped);
        }
        setIsInitialLoad(false);
      }, (err) => {
        console.error("Firebase Sync Error:", err);
        setIsInitialLoad(false);
      });

      const unsubSettings = onSnapshot(doc(db, "settings", "main"), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.flavors) setFlavors(data.flavors);
          if (data.categories) setCategories(data.categories);
          if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
          if (data.storeClosingLogs) setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
        }
      });

      return () => { unsubBuckets(); unsubSettings(); };
    } else {
      const local = localStorage.getItem(STORAGE_KEY_BUCKETS);
      if (local) setBuckets(JSON.parse(local).map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) })));
      setIsInitialLoad(false);
    }
  }, []);

  // 2. MOTOR DE PERSISTÊNCIA ATÔMICA
  const persistState = useCallback(async (
    newBuckets: Bucket[], 
    meta?: { prodLogs?: ProductionLog[], closingLogs?: StoreClosingLog[], flavors?: Flavor[], cats?: Category[] }
  ) => {
    setIsSyncing(true);
    localStorage.setItem(STORAGE_KEY_BUCKETS, JSON.stringify(newBuckets));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "inventory", "all_buckets"), { 
          items: newBuckets,
          updatedAt: new Date().toISOString()
        });

        if (meta) {
          const updateObj: any = {};
          if (meta.prodLogs) updateObj.productionLogs = meta.prodLogs;
          if (meta.closingLogs) updateObj.storeClosingLogs = meta.closingLogs;
          if (meta.flavors) updateObj.flavors = meta.flavors;
          if (meta.cats) updateObj.categories = meta.cats;
          
          if (Object.keys(updateObj).length > 0) {
            await updateDoc(doc(db, "settings", "main"), updateObj);
          }
        }
      } catch (e) {
        console.error("Sync Failure:", e);
        addNotification("Erro de conexão. Dados salvos localmente.", "warning");
      }
    }
    setIsSyncing(false);
  }, []);

  const addProduction = async (entries: ProductionEntry[], productionDate: Date) => {
    const newBucketsToAdd: Bucket[] = [];
    const newLogs: ProductionLog[] = [];
    const dateStr = `${productionDate.getDate().toString().padStart(2, '0')}${(productionDate.getMonth() + 1).toString().padStart(2, '0')}`;

    entries.forEach(entry => {
      const flavor = flavors.find(f => f.id === entry.flavorId);
      const initials = flavor?.initials || 'XXX';
      let seq = buckets.filter(b => b.flavorId === entry.flavorId && b.producedAt.toDateString() === productionDate.toDateString()).length + 1;

      entry.weights.forEach(w => {
        newBucketsToAdd.push({
          id: `${initials}-${dateStr}-${seq.toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4)}`,
          flavorId: entry.flavorId,
          grams: w,
          producedAt: productionDate,
          note: entry.note,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq++
        });
      });

      newLogs.push({
        id: Math.random().toString(36).substr(2, 9),
        flavorId: entry.flavorId,
        totalGrams: entry.weights.reduce((a, b) => a + b, 0),
        bucketCount: entry.weights.length,
        date: productionDate,
        note: entry.note
      });
    });

    const finalBuckets = [...buckets, ...newBucketsToAdd];
    const finalLogs = [...newLogs, ...productionLogs];
    
    setBuckets(finalBuckets);
    setProductionLogs(finalLogs);
    await persistState(finalBuckets, { prodLogs: finalLogs });
    addNotification("Lote de produção sincronizado.", "success");
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const finalBuckets = buckets.map(b => 
      entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b
    );
    setBuckets(finalBuckets);
    await persistState(finalBuckets);
    addNotification(`${entry.bucketIds.length} baldes enviados para ${entry.targetStore}.`, "success");
  };

  const saveStoreClosing = async (storeName: StoreName, closingBuckets: Bucket[]) => {
    const finalBuckets = buckets.map(b => {
      if (b.location === storeName && b.status === 'estoque') {
        const found = closingBuckets.find(cb => cb.id === b.id);
        if (found) {
          return { ...b, grams: found.grams };
        } else {
          return { ...b, status: 'vendido' as const };
        }
      }
      return b;
    });

    const newClosingLog: StoreClosingLog = {
      id: Math.random().toString(36).substr(2, 9),
      storeName,
      date: new Date(),
      totalKg: closingBuckets.reduce((acc, b) => acc + b.grams, 0) / 1000,
      items: closingBuckets.map(b => ({ flavorId: b.flavorId, grams: b.grams }))
    };

    const finalClosingLogs = [newClosingLog, ...storeClosingLogs];
    setBuckets(finalBuckets);
    setStoreClosingLogs(finalClosingLogs);
    await persistState(finalBuckets, { closingLogs: finalClosingLogs });
    addNotification(`Inventário ${storeName} atualizado.`, "success");
  };

  const updateBucket = async (updated: Bucket) => {
    const final = buckets.map(b => b.id === updated.id ? updated : b);
    setBuckets(final);
    await persistState(final);
  };

  const deleteBucket = async (id: string) => {
    const final = buckets.filter(b => b.id !== id);
    setBuckets(final);
    await persistState(final);
  };

  const updateFlavor = async (f: Flavor) => {
    const finalFlavors = flavors.map(old => old.id === f.id ? f : old);
    setFlavors(finalFlavors);
    await persistState(buckets, { flavors: finalFlavors });
  };

  const addCategory = async (name: string) => {
    const finalCats = [...categories, { id: Date.now().toString(), name }];
    setCategories(finalCats);
    await persistState(buckets, { cats: finalCats });
  };

  const updateCategory = async (c: Category) => {
    const finalCats = categories.map(old => old.id === c.id ? c : old);
    setCategories(finalCats);
    await persistState(buckets, { cats: finalCats });
  };

  const deleteCategory = async (id: string) => {
    const finalCats = categories.filter(c => c.id !== id);
    setCategories(finalCats);
    await persistState(buckets, { cats: finalCats });
  };

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [{ id, message, type, timestamp: new Date() }, ...prev].slice(0, 5));
    setTimeout(() => dismissNotification(id), 5000);
  };

  const dismissNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const exportData = () => {
    const data = { buckets, flavors, categories, productionLogs, storeClosingLogs };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lorenza_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const exportToCSV = () => {
    let csv = "Data,Loja,Evento,Valor\n";
    productionLogs.forEach(l => csv += `${l.date.toLocaleDateString()},Fábrica,Produção,${l.totalGrams}g\n`);
    storeClosingLogs.forEach(l => csv += `${l.date.toLocaleDateString()},${l.storeName},Inventário,${l.totalKg}kg\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "lorenza_relatorio.csv";
    a.click();
  };

  const importData = async (json: string) => {
    try {
      const data = JSON.parse(json);
      const b = data.buckets.map((x:any)=>({...x, producedAt: new Date(x.producedAt)}));
      setBuckets(b);
      setFlavors(data.flavors);
      setCategories(data.categories);
      setProductionLogs(data.productionLogs.map((x:any)=>({...x, date: new Date(x.date)})));
      setStoreClosingLogs(data.storeClosingLogs.map((x:any)=>({...x, date: new Date(x.date)})));
      await persistState(b, { 
        prodLogs: data.productionLogs, 
        closingLogs: data.storeClosingLogs, 
        flavors: data.flavors, 
        cats: data.categories 
      });
    } catch (e) { console.error("Import Error", e); }
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, storeClosingLogs, notifications, 
      isSyncing, isInitialLoad, isLocalMode: !isFirebaseConfigured, 
      addProduction, distributeBuckets, updateBucket, deleteBucket, updateFlavor, addCategory, updateCategory, 
      deleteCategory, saveStoreClosing, dismissNotification, exportData, importData, exportToCSV 
    }}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('InventoryContext missing provider');
  return ctx;
};
