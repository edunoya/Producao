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
  const [isSyncing, setIsSyncing] = useState(isFirebaseConfigured);

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
          if (data.storeClosingLogs) {
            const mappedClosing = data.storeClosingLogs.map((l: any) => ({ ...l, date: new Date(l.date) }));
            setStoreClosingLogs(mappedClosing);
            localStorage.setItem(LOCAL_STORAGE_KEYS.CLOSING_LOGS, JSON.stringify(mappedClosing));
          }
        }
      });

      return () => { unsubBuckets(); unsubMeta(); };
    } else {
      const storedBuckets = localStorage.getItem(LOCAL_STORAGE_KEYS.BUCKETS);
      const storedLogs = localStorage.getItem(LOCAL_STORAGE_KEYS.LOGS);
      const storedClosing = localStorage.getItem(LOCAL_STORAGE_KEYS.CLOSING_LOGS);
      const storedFlavors = localStorage.getItem(LOCAL_STORAGE_KEYS.FLAVORS);
      const storedCats = localStorage.getItem(LOCAL_STORAGE_KEYS.CATEGORIES);

      if (storedBuckets) setBuckets(JSON.parse(storedBuckets).map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) })));
      if (storedLogs) setProductionLogs(JSON.parse(storedLogs).map((l: any) => ({ ...l, date: new Date(l.date) })));
      if (storedClosing) setStoreClosingLogs(JSON.parse(storedClosing).map((l: any) => ({ ...l, date: new Date(l.date) })));
      if (storedFlavors) setFlavors(JSON.parse(storedFlavors));
      if (storedCats) setCategories(JSON.parse(storedCats));
      setIsSyncing(false);
    }
  }, []);

  const persistData = async (newBuckets: Bucket[], newLogs: ProductionLog[], newClosingLogs: StoreClosingLog[], newFlavors?: Flavor[], newCats?: Category[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.BUCKETS, JSON.stringify(newBuckets));
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOGS, JSON.stringify(newLogs));
    localStorage.setItem(LOCAL_STORAGE_KEYS.CLOSING_LOGS, JSON.stringify(newClosingLogs));
    if (newFlavors) localStorage.setItem(LOCAL_STORAGE_KEYS.FLAVORS, JSON.stringify(newFlavors));
    if (newCats) localStorage.setItem(LOCAL_STORAGE_KEYS.CATEGORIES, JSON.stringify(newCats));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, "inventory", "all_buckets"), { items: newBuckets });
        await updateDoc(doc(db, "settings", "main"), {
          productionLogs: newLogs,
          storeClosingLogs: newClosingLogs,
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
    await persistData(updatedBuckets, updatedLogs, storeClosingLogs);
    addNotification(`Lote registrado para ${productionDate.toLocaleDateString()}.`, 'success');
  };

  const updateBucket = async (updatedBucket: Bucket) => {
    const updatedBuckets = buckets.map(b => b.id === updatedBucket.id ? updatedBucket : b);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets, productionLogs, storeClosingLogs);
  };

  const deleteBucket = async (id: string) => {
    const updatedBuckets = buckets.filter(b => b.id !== id);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets, productionLogs, storeClosingLogs);
  };

  const saveStoreClosing = async (storeName: StoreName, closingBuckets: Bucket[]) => {
    // 1. Criar Log de Fechamento
    const newClosingLog: StoreClosingLog = {
      id: Math.random().toString(36).substr(2, 9),
      storeName,
      date: new Date(),
      totalKg: closingBuckets.reduce((acc, b) => acc + b.grams, 0) / 1000,
      items: closingBuckets.map(b => ({ flavorId: b.flavorId, grams: b.grams }))
    };

    // 2. Atualizar buckets no estoque global (remover vazios ou atualizar pesos)
    // Aqueles que não estão na lista de fechamento mas eram daquela loja, foram 'vendidos'
    const closingBucketIds = closingBuckets.map(b => b.id);
    const updatedBuckets = buckets.map(b => {
      if (b.location === storeName) {
        const updated = closingBuckets.find(cb => cb.id === b.id);
        if (updated) {
          return { ...b, grams: updated.grams };
        } else {
          return { ...b, status: 'vendido' as const };
        }
      }
      return b;
    }).filter(b => b.status === 'estoque'); // Mantemos apenas o que é estoque real

    const newClosingLogs = [newClosingLog, ...storeClosingLogs];
    setBuckets(updatedBuckets);
    setStoreClosingLogs(newClosingLogs);
    await persistData(updatedBuckets, productionLogs, newClosingLogs);
    addNotification(`Fechamento da loja ${storeName} concluído.`, 'success');
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updatedBuckets = buckets.map(b => entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b);
    setBuckets(updatedBuckets);
    await persistData(updatedBuckets, productionLogs, storeClosingLogs);
    addNotification(`Distribuição concluída para ${entry.targetStore}.`, 'info');
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
    let csv = "Tipo,Data,Entidade,Quantidade/Peso,Info Extra\n";
    productionLogs.forEach(log => {
      const flavor = flavors.find(f => f.id === log.flavorId)?.name || "Desconhecido";
      csv += `PRODUÇÃO,${log.date.toLocaleDateString()},${flavor},${log.totalGrams}g,${log.bucketCount} baldes\n`;
    });
    storeClosingLogs.forEach(log => {
      csv += `FECHAMENTO LOJA,${log.date.toLocaleDateString()},${log.storeName},${log.totalKg.toFixed(1)}kg,${log.items.length} itens\n`;
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
      const importedClosing = (data.storeClosingLogs || []).map((l: any) => ({ ...l, date: new Date(l.date) }));
      
      setBuckets(importedBuckets);
      setFlavors(data.flavors);
      setCategories(data.categories);
      setProductionLogs(importedLogs);
      setStoreClosingLogs(importedClosing);
      
      await persistData(importedBuckets, importedLogs, importedClosing, data.flavors, data.categories);
      addNotification("Dados restaurados com sucesso!", "success");
    } catch (e) { addNotification("Erro na restauração.", "warning"); }
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