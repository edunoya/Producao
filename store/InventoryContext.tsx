import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Notification, StoreName, Flavor, Category, ProductionLog } from '../types';
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
  LOGS: 'lorenza_logs'
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [flavors, setFlavors] = useState<Flavor[]>(INITIAL_FLAVORS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSyncing, setIsSyncing] = useState(isFirebaseConfigured);

  // Carregar dados iniciais (Firebase ou LocalStorage)
  useEffect(() => {
    if (isFirebaseConfigured && db) {
      const unsubBuckets = onSnapshot(collection(db, "inventory"), (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(doc => {
          if (doc.id === "all_buckets") {
            data.push(...doc.data().items);
          }
        });
        const mappedBuckets = data.map(b => ({ ...b, producedAt: new Date(b.producedAt) }));
        setBuckets(mappedBuckets);
        localStorage.setItem(LOCAL_STORAGE_KEYS.BUCKETS, JSON.stringify(mappedBuckets));
        setIsSyncing(false);
      });

      const unsubMeta = onSnapshot(doc(db, "settings", "main"), (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          if (data.flavors) setFlavors(data.flavors);
          if (data.categories) setCategories(data.categories);
          if (data.productionLogs) {
            const mappedLogs = data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) }));
            setProductionLogs(mappedLogs);
            localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(mappedLogs));
          }
        }
      });

      return () => { unsubBuckets(); unsubMeta(); };
    } else {
      // Modo Local
      const storedBuckets = localStorage.getItem(LOCAL_STORAGE_KEYS.BUCKETS);
      const storedLogs = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS);
      const storedFlavors = localStorage.getItem(LOCAL_STORAGE_KEYS.FLAVORS);
      const storedCats = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES);

      if (storedBuckets) setBuckets(JSON.parse(storedBuckets).map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) })));
      if (storedLogs) setProductionLogs(JSON.parse(storedLogs).map((l: any) => ({ ...l, date: new Date(l.date) })));
      if (storedFlavors) setFlavors(JSON.parse(storedFlavors));
      if (storedCats) setCategories(JSON.parse(storedCats));
      setIsSyncing(false);
    }
  }, []);

  const persistData = async (newBuckets: Bucket[], newLogs: ProductionLog[], newFlavors?: Flavor[], newCats?: Category[]) => {
    // Sempre salvar localmente primeiro
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUCKETS, JSON.stringify(newBuckets));
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(newLogs));
    if (newFlavors) localStorage.setItem(LOCAL_STORAGE_KEYS.FLAVORS, JSON.stringify(newFlavors));
    if (newCats) localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(newCats));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "inventory", "all_buckets"), { items: newBuckets });
        await updateDoc(doc(db, "settings", "main"), {
          productionLogs: newLogs,
          flavors: newFlavors || flavors,
          categories: newCats || categories
        });
      } catch (e) {
        console.error("Erro ao sincronizar com Firebase:", e);
      }
    }
  };

  const addNotification = useCallback((message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10));
  }, []);

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
    await persistData(updatedBuckets, updatedLogs);
    addNotification(`Lote registrado para ${productionDate.toLocaleDateString()}.`, 'success');
  };

  const updateBucket = async (updatedBucket: Bucket) => {
    const updatedBuckets = buckets.map(b => b.id === updatedBucket.id ? updatedBucket : b);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets, productionLogs);
  };

  const deleteBucket = async (id: string) => {
    const updatedBuckets = buckets.filter(b => b.id !== id);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets, productionLogs);
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updatedBuckets = buckets.map(b => entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets, productionLogs);
    addNotification(`Distribuição concluída para ${entry.targetStore}.`, 'info');
  };

  const updateFlavor = async (updated: Flavor) => {
    const newFlavors = flavors.map(f => f.id === updated.id ? updated : f);
    setFlavors(newFlavors);
    await persistData(buckets, productionLogs, newFlavors);
  };

  const addCategory = async (name: string) => {
    const newCats = [...categories, { id: Date.now().toString(), name }];
    setCategories(newCats);
    await persistData(buckets, productionLogs, flavors, newCats);
  };

  const updateCategory = async (updated: Category) => {
    const newCats = categories.map(c => c.id === updated.id ? updated : c);
    setCategories(newCats);
    await persistData(buckets, productionLogs, flavors, newCats);
  };

  const deleteCategory = async (id: string) => {
    const newCats = categories.filter(c => c.id !== id);
    setCategories(newCats);
    await persistData(buckets, productionLogs, flavors, newCats);
  };

  const dismissNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const exportData = () => {
    const data = { buckets, flavors, categories, productionLogs };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lorenza_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const exportToCSV = () => {
    let csv = "Data,Sabor,Quantidade,Peso Total (g),Local,Observacao\n";
    productionLogs.forEach(log => {
      const flavor = flavors.find(f => f.id === log.flavorId)?.name || "Desconhecido";
      csv += `${log.date.toLocaleDateString()},${flavor},${log.bucketCount},${log.totalGrams},Fábrica,${log.note || ""}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_lorenza_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      const importedBuckets = data.buckets.map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) }));
      const importedLogs = data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) }));
      
      setBuckets(importedBuckets);
      setFlavors(data.flavors);
      setCategories(data.categories);
      setProductionLogs(importedLogs);
      
      await persistData(importedBuckets, importedLogs, data.flavors, data.categories);
      addNotification("Dados restaurados com sucesso!", "success");
    } catch (e) { addNotification("Erro na restauração.", "warning"); }
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, notifications, isSyncing, isLocalMode: !isFirebaseConfigured, 
      addProduction, distributeBuckets, updateBucket, deleteBucket, updateFlavor, addCategory, updateCategory, 
      deleteCategory, dismissNotification, exportData, importData, exportToCSV 
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
