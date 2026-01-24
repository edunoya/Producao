
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, CheckCircle2, X, Send, RefreshCw, Search, ArrowDownWideNarrow, AlertCircle, Layers } from 'lucide-react';
import { STORES } from '../constants';
import { Bucket } from '../types';

const DistributionForm: React.FC = () => {
  const { distributeBuckets, isSyncing, flavorsMap, getSuggestedDistribution } = useInventory();
  const [targetStore, setTargetStore] = useState(STORES[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const factoryBuckets = useMemo(() => {
    return getSuggestedDistribution('Fábrica');
  }, [getSuggestedDistribution]);

  const groupedBuckets = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = factoryBuckets.filter(b => {
      const flavor = flavorsMap[b.flavorId];
      return flavor?.name.toLowerCase().includes(term) || b.id.toLowerCase().includes(term);
    });

    const groups: Record<string, Bucket[]> = {};
    filtered.forEach(b => {
      if (!groups[b.flavorId]) groups[b.flavorId] = [];
      groups[b.flavorId].push(b);
    });

    return Object.entries(groups).sort((a, b) => {
      const nameA = flavorsMap[a[0]]?.name || '';
      const nameB = flavorsMap[b[0]]?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [factoryBuckets, flavorsMap, searchTerm]);

  const handleSend = async () => {
    if (selectedIds.length === 0 || isSyncing) return;
    setErrorMessage(null);
    try {
      await distributeBuckets({ targetStore, bucketIds: selectedIds });
      setIsSuccess(true);
      setSelectedIds([]);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (e: any) {
      setErrorMessage(e.message || "Falha técnica ao distribuir baldes. Verifique sua rede.");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllOfFlavor = (flavorId: string) => {
    const flavorBuckets = factoryBuckets.filter(b => b.flavorId === flavorId).map(b => b.id);
    const allSelected = flavorBuckets.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !flavorBuckets.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...flavorBuckets])));
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto p-1"><X size={14} /></button>
        </div>
      )}

      <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Distribuição</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Sugerido por Volume de Estoque</p>
          </div>
          <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Truck size={28} />
          </div>
        </header>

        <div className="space-y-3 mb-8">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block">1. Unidade de Destino</label>
          <div className="grid grid-cols-3 gap-2">
            {STORES.map(s => (
              <button 
                key={s} 
                onClick={() => setTargetStore(s)} 
                className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all active:scale-95 ${
                  targetStore === s 
                    ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-600 shadow-md' 
                    : 'border-gray-50 bg-white text-gray-300 hover:border-fuchsia-100'
                }`}
              >
                {s.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Buscar sabor ou ID do balde..." 
            className="w-full bg-fuchsia-50/30 rounded-2xl px-12 py-4 text-sm font-bold outline-none border border-transparent focus:border-fuchsia-100 transition-all shadow-inner"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
          <ArrowDownWideNarrow size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-fuchsia-300" />
        </div>

        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {groupedBuckets.length === 0 ? (
            <div className="py-20 text-center text-gray-300 font-bold italic border-2 border-dashed border-gray-50 rounded-3xl bg-gray-50/30">Nenhum balde disponível na fábrica.</div>
          ) : (
            groupedBuckets.map(([flavorId, bks]) => {
              const flavor = flavorsMap[flavorId];
              const flavorSelectedCount = bks.filter(b => selectedIds.includes(b.id)).length;
              const isAllFlavorSelected = flavorSelectedCount === bks.length;

              return (
                <div key={flavorId} className="space-y-3 p-4 bg-fuchsia-50/10 rounded-3xl border border-fuchsia-50">
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-fuchsia-300" />
                      <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{flavor?.name}</h4>
                    </div>
                    <button 
                      onClick={() => selectAllOfFlavor(flavorId)}
                      className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all ${
                        isAllFlavorSelected 
                          ? 'bg-fuchsia-600 text-white' 
                          : 'bg-white text-fuchsia-400 border border-fuchsia-100 hover:bg-fuchsia-50'
                      }`}
                    >
                      {isAllFlavorSelected ? 'Remover Todos' : `Selecionar ${bks.length} un.`}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {bks.map(b => {
                      const isSelected = selectedIds.includes(b.id);
                      return (
                        <button 
                          key={b.id} 
                          onClick={() => toggleSelection(b.id)} 
                          className={`w-full p-4 rounded-xl flex justify-between items-center border transition-all active:scale-[0.98] ${
                            isSelected 
                              ? 'bg-white text-fuchsia-600 border-fuchsia-500 shadow-md ring-2 ring-fuchsia-50' 
                              : 'bg-white border-fuchsia-50 text-gray-500 hover:bg-white/50'
                          }`}
                        >
                          <span className="text-[9px] font-mono tracking-tight">{b.id}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-xs">{b.grams}g</span>
                            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${isSelected ? 'bg-fuchsia-600 border-fuchsia-600 text-white' : 'border-fuchsia-100'}`}>
                              {isSelected && <CheckCircle2 size={12} />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-fuchsia-50">
          <div className="flex justify-between items-end mb-6 px-2">
            <div>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Baldes Selecionados</p>
              <h4 className="text-2xl font-black text-gray-800">{selectedIds.length}</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Peso Total</p>
              <h4 className="text-2xl font-black text-fuchsia-600">
                {(selectedIds.reduce((acc, id) => {
                  const bk = factoryBuckets.find(b => b.id === id);
                  return acc + (bk?.grams || 0);
                }, 0) / 1000).toFixed(1)}kg
              </h4>
            </div>
          </div>

          <button 
            onClick={handleSend}
            disabled={selectedIds.length === 0 || isSyncing}
            className={`w-full py-6 rounded-[32px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-20 disabled:grayscale ${
              isSuccess ? 'bg-green-500 text-white shadow-green-100' : 'magenta-gradient text-white shadow-fuchsia-200'
            }`}
          >
            {isSyncing ? <RefreshCw size={24} className="animate-spin" /> : isSuccess ? <CheckCircle2 size={24} /> : <Send size={20} />}
            {isSyncing ? 'Sincronizando...' : isSuccess ? 'Enviado!' : `Transferir para ${targetStore}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;
