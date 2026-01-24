
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Bucket, ProductionEntry, DistributionEntry, Flavor, Category, ProductionLog, StoreClosingLog, StoreName } from '../types';
import { INITIAL_FLAVORS, INITIAL_CATEGORIES } from '../constants';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';

interface InventoryContextType {
  buckets: Bucket[];
  flavors: Flavor[];
  flavorsMap: Record<string, Flavor>;
  categories: Category[];
  productionLogs: ProductionLog[];
  storeClosingLogs: StoreClosingLog[];
  isSyncing: boolean;
  isInitialLoad: boolean;
  addProductionBatch: (entries: ProductionEntry[], note: string, date: Date) => Promise<void>;
  updateProductionBatch: (id: string, entries: ProductionEntry[], note: string) => Promise<void>;
  deleteProductionBatch: (id: string) => Promise<void>;
  distributeBuckets: (entry: DistributionEntry) => Promise<void>;
  saveStoreClosing: (store: StoreName, closingBuckets: Bucket[]) => Promise<void>;
  markAsSold: (bucketId: string) => Promise<void>;
  deleteBucket: (id: string) => Promise<void>;
  updateBucketWeight: (id: string, grams: number) => Promise<void>;
  updateFlavor: (f: Flavor) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  exportToCSV: () => void;
  resetDatabase: () => Promise<void>;
  getSuggestedDistribution: (location: StoreName) => Bucket[];
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

  // Memoized flavor map for O(1) lookups throughout the app
  const flavorsMap = useMemo(() => {
    return flavors.reduce((acc, f) => ({ ...acc, [f.id]: f }), {} as Record<string, Flavor>);
  }, [flavors]);

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

        // Batch updates to minimize re-renders
        if (data.buckets) setBuckets(data.buckets.map((b: any) => ({ ...b, producedAt: toDate(b.producedAt) })));
        if (data.flavors) setFlavors(data.flavors);
        if (data.categories) setCategories(data.categories);
        if (data.productionLogs) setProductionLogs(data.productionLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
        if (data.storeClosingLogs) setStoreClosingLogs(data.storeClosingLogs.map((l: any) => ({ ...l, date: toDate(l.date) })));
      }
      setIsInitialLoad(false);
    }, (error) => {
      console.error("Firebase Snapshot Error:", error.message);
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
    } catch (e: any) {
      console.error("Persistence Error:", e.message);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  // Reusable logic for sorting buckets based on flavor stock volume (suggested distribution)
  const getSuggestedDistribution = useCallback((location: StoreName) => {
    const locBuckets = buckets.filter(b => b.location === location && b.status === 'estoque');
    
    // Summary of stock per flavor for this location
    const stockSummary: Record<string, number> = {};
    locBuckets.forEach(b => {
      stockSummary[b.flavorId] = (stockSummary[b.flavorId] || 0) + b.grams;
    });

    return [...locBuckets].sort((a, b) => {
      const stockA = stockSummary[a.flavorId] || 0;
      const stockB = stockSummary[b.flavorId] || 0;
      // Primary: More stock first
      if (stockB !== stockA) return stockB - stockA;
      // Secondary: Alphabetical
      const nameA = flavorsMap[a.flavorId]?.name || '';
      const nameB = flavorsMap[b.flavorId]?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [buckets, flavorsMap]);

  const addProductionBatch = async (entries: ProductionEntry[], note: string, date: Date) => {
    const newBuckets: Bucket[] = [];
    const logEntries: any[] = [];
    const batchId = Math.random().toString(36).slice(2);
    
    entries.forEach(entry => {
      const flavor = flavorsMap[entry.flavorId];
      let seq = buckets.filter(b => b.flavorId === entry.flavorId).length + 1;
      
      const totalGrams = entry.weights.reduce((a, b) => {
        const val = Number(b);
        return Math.round((a + val) * 100) / 100;
      }, 0);

      entry.weights.forEach(w => {
        newBuckets.push({
          id: `${flavor?.initials || 'G'}-${Date.now().toString().slice(-4)}-${seq++}`,
          flavorId: entry.flavorId,
          grams: Number(w),
          producedAt: date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq,
          note: batchId
        });
      });

      logEntries.push({
        flavorId: entry.flavorId,
        totalGrams,
        bucketCount: entry.weights.length
      });
    });

    const success = await persist({ 
      buckets: [...buckets, ...newBuckets], 
      productionLogs: [{ id: batchId, batchNote: note, entries: logEntries, date } as ProductionLog, ...productionLogs] 
    });
    
    if (!success) throw new Error("Erro de rede: Não foi possível salvar o lote de produção no Firebase.");
  };

  const updateProductionBatch = async (id: string, entries: ProductionEntry[], note: string) => {
    const filteredBuckets = buckets.filter(b => b.note !== id);
    const log = productionLogs.find(l => l.id === id);
    if (!log) return;

    const newBuckets: Bucket[] = [];
    const logEntries: any[] = [];
    
    entries.forEach(entry => {
      const flavor = flavorsMap[entry.flavorId];
      let seq = filteredBuckets.filter(b => b.flavorId === entry.flavorId).length + 1;
      
      const totalGrams = entry.weights.reduce((a, b) => {
        const val = Number(b);
        return Math.round((a + val) * 100) / 100;
      }, 0);

      entry.weights.forEach(w => {
        newBuckets.push({
          id: `${flavor?.initials || 'G'}-${Date.now().toString().slice(-4)}-${seq++}`,
          flavorId: entry.flavorId,
          grams: Number(w),
          producedAt: log.date,
          location: 'Fábrica',
          status: 'estoque',
          sequence: seq,
          note: id
        });
      });

      logEntries.push({
        flavorId: entry.flavorId,
        totalGrams,
        bucketCount: entry.weights.length
      });
    });

    const success = await persist({
      buckets: [...filteredBuckets, ...newBuckets],
      productionLogs: productionLogs.map(l => l.id === id ? { ...l, batchNote: note, entries: logEntries } : l)
    });
    
    if (!success) throw new Error("Falha na atualização: O servidor não respondeu. Tente novamente.");
  };

  const deleteProductionBatch = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este lote? Esta ação removerá todos os baldes associados permanentemente.")) return;
    const success = await persist({ 
      buckets: buckets.filter(b => b.note !== id), 
      productionLogs: productionLogs.filter(l => l.id !== id) 
    });
    if (!success) throw new Error("Erro ao excluir: Falha na conexão com o banco de dados.");
  };

  const distributeBuckets = async (entry: DistributionEntry) => {
    const updated = buckets.map(b => 
      entry.bucketIds.includes(b.id) ? { ...b, location: entry.targetStore } : b
    );
    const success = await persist({ buckets: updated });
    if (!success) throw new Error("Erro de transferência: Ocorreu um problema ao sincronizar a distribuição.");
  };

  const markAsSold = async (bucketId: string) => {
    const updated = buckets.map(b => b.id === bucketId ? { ...b, status: 'vendido' as const } : b);
    const success = await persist({ buckets: updated });
    if (!success) throw new Error("Sincronização falhou: Não foi possível atualizar o status de venda.");
  };

  const updateBucketWeight = async (id: string, grams: number) => {
    const updated = buckets.map(b => b.id === id ? { ...b, grams: Number(grams) } : b);
    const success = await persist({ buckets: updated });
    if (!success) throw new Error("Erro de peso: Falha ao salvar a nova gramagem.");
  };

  const saveStoreClosing = async (store: StoreName, closingBuckets: Bucket[]) => {
    const updated = buckets.map(b => {
      if (b.location === store && b.status === 'estoque') {
        const found = closingBuckets.find(cb => cb.id === b.id);
        return found ? { ...b, grams: Number(found.grams) } : { ...b, status: 'vendido' as const };
      }
      return b;
    });

    const totalKg = closingBuckets.reduce((a, b) => {
      const val = Number(b.grams);
      return Math.round((a + val) * 100) / 100;
    }, 0) / 1000;

    const log: StoreClosingLog = {
      id: Math.random().toString(36).slice(2),
      storeName: store,
      date: new Date(),
      totalKg,
      items: closingBuckets.map(b => ({ flavorId: b.flavorId, grams: Number(b.grams) }))
    };

    const success = await persist({ buckets: updated, storeClosingLogs: [log, ...storeClosingLogs] });
    if (!success) throw new Error("Erro de fechamento: Falha ao salvar os dados da loja.");
  };

  const deleteBucket = async (id: string) => {
    const success = await persist({ buckets: buckets.filter(b => b.id !== id) });
    if (!success) throw new Error("Ação negada: Não foi possível remover o item do servidor.");
  };

  const updateFlavor = async (f: Flavor) => {
    const success = await persist({ flavors: flavors.map(old => old.id === f.id ? f : old) });
    if (!success) throw new Error("Falha na edição: O sabor não pôde ser atualizado.");
  };

  const addCategory = async (name: string) => {
    const success = await persist({ categories: [...categories, { id: Date.now().toString(), name }] });
    if (!success) throw new Error("Erro de categoria: Falha ao criar no Firebase.");
  };

  const resetDatabase = async () => {
    if (!window.confirm("CUIDADO: Isso apagará absolutamente tudo. Tem certeza absoluta?")) return;
    await persist({ buckets: [], productionLogs: [], storeClosingLogs: [], flavors: INITIAL_FLAVORS, categories: INITIAL_CATEGORIES });
  };

  const exportToCSV = () => {
    const header = "\uFEFFData Produção,Lote/Nota,Sabor Gelato,Massa Total (kg),Volumes (Unidades)\n";
    const rows = productionLogs.flatMap(l => 
      l.entries.map(e => {
        const flavorName = flavorsMap[e.flavorId]?.name || "Desconhecido";
        const massKg = (e.totalGrams / 1000).toFixed(3).replace('.', ',');
        return `${l.date.toLocaleDateString('pt-BR')},"${l.batchNote || ''}","${flavorName}",${massKg},${e.bucketCount}`;
      })
    ).join('\n');

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const timeFormatted = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lorenza_Export_${dateFormatted}_${timeFormatted}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <InventoryContext.Provider value={{ 
      buckets, flavors, flavorsMap, categories, productionLogs, storeClosingLogs, isSyncing, isInitialLoad,
      addProductionBatch, updateProductionBatch, deleteProductionBatch, distributeBuckets, saveStoreClosing, 
      markAsSold, deleteBucket, updateBucketWeight, updateFlavor, addCategory, 
      exportToCSV, resetDatabase, getSuggestedDistribution
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
