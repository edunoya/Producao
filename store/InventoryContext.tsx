
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Notification, StoreName, Flavor, Category, ProductionLog, StoreClosingLog } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { 
  collection, 
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

const LOCAL_STORAGE_KEYS = {
  BUCKETS: 'lorenza_buckets',
  FLAVORS: 'lorenza_flavors',
  CATEGORIES: 'lorenza_categories',
  LOGS: 'lorenza_logs',
  CLOSING_LOGS: 'lorenza_closing_logs'
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [storeClosingLogs, setStoreClosingLogs] = useState<StoreClosingLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);

  // Escuta as mudanças no estoque (buckets)
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const unsubBuckets = onSnapshot(doc(db, "inventory", "all_buckets"), (docSnap) => {
        if (docSnap.exists()) {
          const items = docSnap.data().items || [];
          const mappedBuckets = items.map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) }));
          setBuckets(mappedBuckets);
          localStorage.setItem(LOCAL_STORAGE_KEYS.BUCKETS, JSON.stringify(mappedBuckets));
        }
        setIsSyncing(false);
      }, (error) => {
        console.error("Firestore Buckets Error:", error);
        setIsSyncing(false);
      });

      const unsubSettings = onSnapshot(doc(db, "settings", "main"), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.flavors) setFlavors(data.flavors);
          if (data.categories) setCategories(data.categories);
          if (data.productionLogs) {
            setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
          }
          if (data.storeClosingLogs) {
            setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
          }
        }
      });

      return () => { unsubBuckets(); unsubSettings(); };
    } else {
      const storedBuckets = localStorage.getItem(LOCAL_STORAGE_KEYS.BUCKETS);
      if (storedBuckets) setBuckets(JSON.parse(storedBuckets).map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) })));
      setIsSyncing(false);
    }
  }, []);

  const persistData = async (newBuckets: Bucket[], newLogs?: ProductionLog[], newClosingLogs?: StoreClosingLog[], newFlavors?: Flavor[], newCats?: Category[]) => {
    // LocalStorage como fallback imediato
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUCKETS, JSON.stringify(newBuckets));
    
    if (isFirebaseConfigured && db) {
      try {
        // Atualiza a coleção de inventário (documento único all_buckets para facilitar sincronização de arrays)
        await setDoc(doc(db, "inventory", "all_buckets"), { 
          items: newBuckets,
          lastUpdated: new Date().toISOString()
        });

        // Atualiza logs e configurações no doc de settings
        const settingsUpdate: any = {};
        if (newLogs) settingsUpdate.productionLogs = newLogs;
        if (newClosingLogs) settingsUpdate.storeClosingLogs = newClosingLogs;
        if (newFlavors) settingsUpdate.flavors = newFlavors;
        if (newCats) settingsUpdate.categories = newCats;

        if (Object.keys(settingsUpdate).length > 0) {
          await updateDoc(doc(db, "settings", "main"), settingsUpdate);
        }
      } catch (e) {
        console.error("Erro ao sincronizar com Firebase:", e);
      }
    }
  };

  const addProduction = async (entries: ProductionEntry[], productionDate: Date) => {
    const newBuckets: Bucket[] = [];
    const newLogs: ProductionLog[] = [];
    const dateStr = `${productionDate.getDate().toString().padStart(2, '0')}${(productionDate.getMonth() + 1).toString().padStart(2, '0')}`;

    entries.forEach(entry => {
      const flavor = flavors.find(f => f.id === entry.flavorId);
      const initials = flavor?.initials || 'XXX';
      
      let dailySeq = buckets.filter(b => 
        b.flavorId === entry.flavorId && 
        new Date(b.producedAt).toLocaleDateString() === productionDate.toLocaleDateString()
      ).length + 1;

      entry.weights.forEach(weight => {
        newBuckets.push({
          id: `${initials}-${dateStr}-${dailySeq.toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4)}`,
          flavorId: entry.flavorId,
          grams: weight,
          producedAt: productionDate,
          note: entry.note,
          location: 'Fábrica',
          status: 'estoque',
          sequence: dailySeq
        });
        dailySeq++;
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

    const updatedBuckets = [...buckets, ...newBuckets];
    const updatedLogs = [...newLogs, ...productionLogs];
    setBuckets(updatedBuckets);
    setProductionLogs(updatedLogs);
    await persistData(updatedBuckets, updatedLogs, storeClosingLogs);
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updatedBuckets = buckets.map(b => 
      entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b
    );
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets);
    
    addNotification(`${entry.bucketIds.length} baldes enviados para ${entry.targetStore}`, 'success');
  };

  const saveStoreClosing = async (storeName: StoreName, closingBuckets: Bucket[]) => {
    // 1. Marcar como vendido baldes que estavam na loja mas não foram incluídos no inventário enviado
    // 2. Atualizar peso dos que restaram
    const storeBucketsIdsAntes = buckets.filter(b => b.location === storeName && b.status === 'estoque').map(b => b.id);
    const idsPresentesNoInventario = closingBuckets.map(b => b.id);
    
    const updatedBuckets = buckets.map(b => {
      if (b.location === storeName && b.status === 'estoque') {
        const itemEnviado = closingBuckets.find(cb => cb.id === b.id);
        if (itemEnviado) {
          return { ...b, grams: itemEnviado.grams };
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

    const newClosingLogs = [newClosingLog, ...storeClosingLogs];
    setBuckets(updatedBuckets);
    setStoreClosingLogs(newClosingLogs);
    await persistData(updatedBuckets, productionLogs, newClosingLogs);
    addNotification(`Estoque da ${storeName} sincronizado com sucesso!`, 'success');
  };

  const updateBucket = async (updatedBucket: Bucket) => {
    const updatedBuckets = buckets.map(b => b.id === updatedBucket.id ? updatedBucket : b);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets);
  };

  const deleteBucket = async (id: string) => {
    const updatedBuckets = buckets.filter(b => b.id !== id);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets);
  };

  const updateFlavor = async (updated: Flavor) => {
    const newFlavors = flavors.map(f => f.id === updated.id ? updated : f);
    setFlavors(newFlavors);
    await persistData(buckets, productionLogs, storeClosingLogs, newFlavors);
  };

  const addCategory = async (name: string) => {
    const newCats = [...categories, { id: Date.now().toString(), name }];
    setCategories(newCats);
    await persistData(buckets, productionLogs, storeClosingLogs, flavors, newCats);
  };

  const updateCategory = async (updated: Category) => {
    const newCats = categories.map(c => c.id === updated.id ? updated : c);
    setCategories(newCats);
    await persistData(buckets, productionLogs, storeClosingLogs, flavors, newCats);
  };

  const deleteCategory = async (id: string) => {
    const newCats = categories.filter(c => c.id !== id);
    setCategories(newCats);
    await persistData(buckets, productionLogs, storeClosingLogs, flavors, newCats);
  };

  const addNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 5));
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
    let csv = "Tipo,Data,Entidade,Quantidade/Peso\n";
    productionLogs.forEach(log => {
      const flavor = flavors.find(f => f.id === log.flavorId)?.name || "N/A";
      csv += `PRODUCAO,${log.date.toLocaleDateString()},${flavor},${log.totalGrams}g\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lorenza_relatorio.csv`);
    link.click();
  };

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      const mappedBuckets = data.buckets.map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) }));
      const mappedLogs = data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) }));
      const mappedClosing = (data.storeClosingLogs || []).map((l: any) => ({ ...l, date: new Date(l.date) }));
      
      setBuckets(mappedBuckets);
      setFlavors(data.flavors);
      setCategories(data.categories);
      setProductionLogs(mappedLogs);
      setStoreClosingLogs(mappedClosing);
      
      await persistData(mappedBuckets, mappedLogs, mappedClosing, data.flavors, data.categories);
    } catch (e) { console.error("Erro importação:", e); }
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, storeClosingLogs, notifications, isSyncing, isLocalMode: !isFirebaseConfigured, 
      addProduction, distributeBuckets, updateBucket, deleteBucket, updateFlavor, addCategory, updateCategory, 
      deleteCategory, saveStoreClosing, dismissNotification, exportData, importData, exportToCSV 
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
