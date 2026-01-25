
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, CheckCircle2, X, Send, RefreshCw, Search, ArrowDownWideNarrow, AlertCircle, Layers, MousePointer2, Trash2, Zap } from 'lucide-react';
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

  const selectTopStock = () => {
    const flavorTotals: Record<string, number> = {};
    factoryBuckets.forEach(b => {
      flavorTotals[b.flavorId] = (flavorTotals[b.flavorId] || 0) + b.grams;
    });

    const topFlavorIds = Object.entries(flavorTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    const idsToSelect = factoryBuckets
      .filter(b => topFlavorIds.includes(b.flavorId))
      .map(b => b.id);

    setSelectedIds(Array.from(new Set([...selectedIds, ...idsToSelect])));
  };

  const clearSelection = () => setSelectedIds([]);

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
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Movimentação de Estoque</p>
          </div>
          <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Truck size={28} />
          </div>
        </header>

        <div className="space-y-3 mb-8">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block">1. Destino da Carga</label>
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

        {/* Ações Rápidas de Seleção */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={selectTopStock}
            className="flex-1 bg-fuchsia-50 text-fuchsia-600 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-fuchsia-100 transition-colors"
          >
            <Zap size={14} /> Top 3 Estoque
          </button>
          <button 
            onClick={clearSelection}
            disabled={selectedIds.length === 0}
            className="px-6 bg-gray-50 text-gray-400 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-30"
          >
            <Trash2 size={14} /> Limpar
          </button>
        </div>

        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Buscar sabor ou ID..." 
            className="w-full bg-fuchsia-50/30 rounded-2xl px-12 py-4 text-sm font-bold outline-none border border-transparent focus:border-fuchsia-100 transition-all shadow-inner"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
          <ArrowDownWideNarrow size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-fuchsia-300" />
        </div>

        <div className="space-y-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
          {groupedBuckets.length === 0 ? (
            <div className="py-20 text-center text-gray-300 font-bold italic border-2 border-dashed border-gray-50 rounded-3xl bg-gray-50/30">
              Nenhum item disponível na fábrica.
            </div>
          ) : (
            groupedBuckets.map(([flavorId, bks]) => {
              const flavor = flavorsMap[flavorId];
              const flavorSelectedCount = bks.filter(b => selectedIds.includes(b.id)).length;
              const isAllFlavorSelected = flavorSelectedCount === bks.length && bks.length > 0;

              return (
                <div key={flavorId} className="space-y-3 p-4 bg-white rounded-3xl border border-fuchsia-50/50 shadow-sm">
                  <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-fuchsia-400"></div>
                      <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-widest truncate max-w-[150px]">{flavor?.name}</h4>
                    </div>
                    <button 
                      onClick={() => selectAllOfFlavor(flavorId)}
                      className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                        isAllFlavorSelected 
                          ? 'bg-fuchsia-600 text-white shadow-md' 
                          : 'bg-fuchsia-50 text-fuchsia-400 border border-fuchsia-100 hover:bg-fuchsia-100'
                      }`}
                    >
                      <MousePointer2 size={10} />
                      {isAllFlavorSelected ? 'Remover' : `Selecionar ${bks.length}`}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {bks.map(b => {
                      const isSelected = selectedIds.includes(b.id);
                      return (
                        <button 
                          key={b.id} 
                          onClick={() => toggleSelection(b.id)} 
                          className={`w-full p-4 rounded-2xl flex justify-between items-center border transition-all active:scale-[0.98] ${
                            isSelected 
                              ? 'bg-fuchsia-50/50 text-fuchsia-600 border-fuchsia-300 shadow-sm ring-2 ring-fuchsia-50' 
                              : 'bg-white border-gray-100 text-gray-500 hover:border-fuchsia-100'
                          }`}
                        >
                          <div className="flex flex-col items-start">
                            <span className="text-[8px] font-mono uppercase text-gray-300 mb-1">{b.id}</span>
                            <span className="font-black text-xs">{b.grams}{b.unitType === 'Balde' ? 'g' : 'un'}</span>
                          </div>
                          <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-fuchsia-600 border-fuchsia-600 text-white' : 'border-fuchsia-100 bg-white'}`}>
                            {isSelected && <CheckCircle2 size={14} />}
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
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Selecionados</p>
              <h4 className="text-3xl font-black text-gray-800 tracking-tighter">{selectedIds.length} <span className="text-sm text-gray-400 font-bold">un</span></h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Peso Estimado</p>
              <h4 className="text-3xl font-black text-fuchsia-600 tracking-tighter">
                {(selectedIds.reduce((acc, id) => {
                  const bk = factoryBuckets.find(b => b.id === id);
                  return acc + (bk?.grams || 0);
                }, 0) / 1000).toFixed(1)} <span className="text-sm font-bold">kg</span>
              </h4>
            </div>
          </div>

          <button 
            onClick={handleSend}
            disabled={selectedIds.length === 0 || isSyncing}
            className={`w-full py-7 rounded-[32px] font-black uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-20 disabled:grayscale ${
              isSuccess ? 'bg-green-500 text-white shadow-green-100' : 'magenta-gradient text-white shadow-fuchsia-200'
            }`}
          >
            {isSyncing ? <RefreshCw size={24} className="animate-spin" /> : isSuccess ? <CheckCircle2 size={24} /> : <Send size={20} />}
            {isSyncing ? 'Enviando...' : isSuccess ? 'Sucesso!' : `Enviar para ${targetStore}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;
