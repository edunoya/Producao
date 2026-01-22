
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Notification, StoreName, Flavor, Category, ProductionLog } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc, 
  arrayUnion,
  getDoc
} from 'firebase/firestore';

interface InventoryContextType {
  buckets: Bucket[];
  flavors: Flavor[];
  categories: Category[];
  productionLogs: ProductionLog[];
  notifications: Notification[];
  isSyncing: boolean;
  addProduction: (entries: ProductionEntry[]) => void;
  distributeBuckets: (entry: DistributionEntry) => void;
  updateFlavor: (flavor: Flavor) => void;
  addCategory: (name: string) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  dismissNotification: (id: string) => void;
  exportData: () => void;
  importData: (jsonData: string) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);

  // Sincronização em Tempo Real com Firestore
  useEffect(() => {
    const unsubBuckets = onSnapshot(collection(db, "inventory"), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push(...doc.data().items));
      setBuckets(data.map(b => ({ ...b, producedAt: new Date(b.producedAt) })));
      setIsSyncing(false);
    });

    const unsubMeta = onSnapshot(doc(db, "settings", "main"), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.flavors) setFlavors(data.flavors);
        if (data.categories) setCategories(data.categories);
        if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
      }
    });

    return () => { unsubBuckets(); unsubMeta(); };
  }, []);

  const addNotification = useCallback((message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10));
  }, []);

  const syncToCloud = async (newBuckets: Bucket[], newLogs: ProductionLog[]) => {
    try {
      // Salva baldes (divididos por lotes para performance)
      await setDoc(doc(db, "inventory", "all_buckets"), { items: [...buckets, ...newBuckets] });
      // Salva Logs e Meta
      await updateDoc(doc(db, "settings", "main"), {
        productionLogs: [...newLogs, ...productionLogs],
        flavors,
        categories
      });
    } catch (e) {
      console.error("Erro ao sincronizar:", e);
      addNotification("Erro de conexão com a nuvem", "warning");
    }
  };

  const addProduction = async (entries: ProductionEntry[]) => {
    const newBuckets: Bucket[] = [];
    const newLogs: ProductionLog[] = [];
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}`;

    entries.forEach(entry => {
      const flavor = flavors.find(f => f.id === entry.flavorId);
      const initials = flavor?.initials || 'XXX';
      let dailySeq = buckets.filter(b => b.flavorId === entry.flavorId && new Date(b.producedAt).toDateString() === today.toDateString()).length + 1;

      entry.weights.forEach(weight => {
        newBuckets.push({
          id: `${initials}-${dateStr}-${dailySeq.toString().padStart(2, '0')}`,
          flavorId: entry.flavorId,
          grams: weight,
          producedAt: new Date(),
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
        date: new Date(),
        note: entry.note
      });
    });

    await syncToCloud(newBuckets, newLogs);
    addNotification(`Produção registrada na nuvem.`, 'success');
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updatedBuckets = buckets.map(b => entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b);
    await setDoc(doc(db, "inventory", "all_buckets"), { items: updatedBuckets });
    addNotification(`Distribuição sincronizada.`, 'info');
  };

  const updateFlavor = async (updated: Flavor) => {
    const newFlavors = flavors.map(f => f.id === updated.id ? updated : f);
    setFlavors(newFlavors);
    await updateDoc(doc(db, "settings", "main"), { flavors: newFlavors });
  };

  const addCategory = async (name: string) => {
    const newCats = [...categories, { id: Date.now().toString(), name }];
    setCategories(newCats);
    await updateDoc(doc(db, "settings", "main"), { categories: newCats });
  };

  const updateCategory = async (updated: Category) => {
    const newCats = categories.map(c => c.id === updated.id ? updated : c);
    setCategories(newCats);
    await updateDoc(doc(db, "settings", "main"), { categories: newCats });
  };

  const deleteCategory = async (id: string) => {
    const newCats = categories.filter(c => c.id !== id);
    setCategories(newCats);
    await updateDoc(doc(db, "settings", "main"), { categories: newCats });
  };

  const dismissNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const exportData = () => {
    const data = { buckets, flavors, categories, productionLogs };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gelatoflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      await setDoc(doc(db, "inventory", "all_buckets"), { items: data.buckets });
      await setDoc(doc(db, "settings", "main"), {
        flavors: data.flavors,
        categories: data.categories,
        productionLogs: data.productionLogs
      });
      addNotification("Dados importados para a nuvem!", "success");
    } catch (e) { addNotification("Erro na importação.", "warning"); }
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, notifications, isSyncing, addProduction, distributeBuckets, 
      updateFlavor, addCategory, updateCategory, deleteCategory, dismissNotification, exportData, importData 
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
