
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Notification, StoreName, Flavor, Category, ProductionLog } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';

interface InventoryContextType {
  buckets: Bucket[];
  flavors: Flavor[];
  categories: Category[];
  productionLogs: ProductionLog[];
  notifications: Notification[];
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
  const [buckets, setBuckets] = useState<Bucket[]>(() => {
    const saved = localStorage.getItem('gelatoflow_buckets');
    if (saved) {
      try {
        return JSON.parse(saved).map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) }));
      } catch (e) { return []; }
    }
    return [];
  });

  const [flavors, setFlavors] = useState<Flavor[]>(() => {
    const saved = localStorage.getItem('gelatoflow_flavors');
    return saved ? JSON.parse(saved) : INITIAL_FLAVORS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('gelatoflow_categories');
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });

  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>(() => {
    const saved = localStorage.getItem('gelatoflow_production_logs');
    if (saved) {
      try {
        return JSON.parse(saved).map((l: any) => ({ ...l, date: new Date(l.date) }));
      } catch (e) { return []; }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    localStorage.setItem('gelatoflow_buckets', JSON.stringify(buckets));
    localStorage.setItem('gelatoflow_flavors', JSON.stringify(flavors));
    localStorage.setItem('gelatoflow_categories', JSON.stringify(categories));
    localStorage.setItem('gelatoflow_production_logs', JSON.stringify(productionLogs));
  }, [buckets, flavors, categories, productionLogs]);

  const addNotification = useCallback((message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: new Date(),
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 10));
  }, []);

  const addProduction = (entries: ProductionEntry[]) => {
    const newBuckets: Bucket[] = [];
    const newLogs: ProductionLog[] = [];
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}${(today.getMonth() + 1).toString().padStart(2, '0')}`;

    entries.forEach(entry => {
      const flavor = flavors.find(f => f.id === entry.flavorId);
      const initials = flavor?.initials || 'XXX';
      
      let dailySeq = buckets.filter(b => 
        b.flavorId === entry.flavorId && 
        new Date(b.producedAt).toDateString() === today.toDateString()
      ).length + 1;

      entry.weights.forEach(weight => {
        const zz = dailySeq.toString().padStart(2, '0');
        newBuckets.push({
          id: `${initials}-${dateStr}-${zz}`,
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

    setBuckets(prev => [...prev, ...newBuckets]);
    setProductionLogs(prev => [...newLogs, ...prev]);
    addNotification(`Produção de ${newBuckets.length} baldes registrada.`, 'success');
  };

  const distributeBuckets = (entry: DistributionEntry) => {
    setBuckets(prev => prev.map(b => entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b));
    addNotification(`Distribuição concluída para ${entry.targetStore}.`, 'info');
  };

  const updateFlavor = (updated: Flavor) => {
    setFlavors(prev => prev.map(f => f.id === updated.id ? updated : f));
  };

  const addCategory = (name: string) => {
    setCategories(prev => [...prev, { id: Date.now().toString(), name }]);
  };

  const updateCategory = (updated: Category) => {
    setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
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

  const importData = (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.buckets) setBuckets(data.buckets.map((b: any) => ({ ...b, producedAt: new Date(b.producedAt) })));
      if (data.flavors) setFlavors(data.flavors);
      if (data.categories) setCategories(data.categories);
      if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: new Date(l.date) })));
      addNotification("Sincronização realizada!", "success");
    } catch (e) { addNotification("Erro na importação.", "warning"); }
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, categories, productionLogs, notifications, addProduction, distributeBuckets, 
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
