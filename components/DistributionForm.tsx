
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, CheckCircle2, X, Send, RefreshCw, Search, ArrowDownWideNarrow } from 'lucide-react';
import { STORES } from '../constants';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, distributeBuckets, isSyncing } = useInventory();
  const [targetStore, setTargetStore] = useState(STORES[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Baldes na fábrica em estoque
  const factoryBuckets = useMemo(() => {
    return buckets.filter(b => b.location === 'Fábrica' && b.status === 'estoque');
  }, [buckets]);

  // Resumo de estoque por sabor (gramas totais) para ordenação
  const stockSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    factoryBuckets.forEach(b => {
      summary[b.flavorId] = (summary[b.flavorId] || 0) + b.grams;
    });
    return summary;
  }, [factoryBuckets]);

  // Filtro e ordenação: Maior estoque primeiro
  const sortedAndFilteredBuckets = useMemo(() => {
    return factoryBuckets
      .filter(b => {
        const flavor = flavors.find(fl => fl.id === b.flavorId);
        const term = searchTerm.toLowerCase();
        return flavor?.name.toLowerCase().includes(term) || b.id.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        // Ordenação primária: Quantidade em estoque do sabor
        const stockA = stockSummary[a.flavorId] || 0;
        const stockB = stockSummary[b.flavorId] || 0;
        if (stockB !== stockA) return stockB - stockA;
        
        // Ordenação secundária: Nome do sabor
        const nameA = flavors.find(f => f.id === a.flavorId)?.name || '';
        const nameB = flavors.find(f => f.id === b.flavorId)?.name || '';
        return nameA.localeCompare(nameB);
      });
  }, [factoryBuckets, flavors, searchTerm, stockSummary]);

  const handleSend = async () => {
    if (selectedIds.length === 0 || isSyncing) return;
    try {
      await distributeBuckets({ targetStore, bucketIds: selectedIds });
      setIsSuccess(true);
      setSelectedIds([]);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (e) {
      alert("Erro ao realizar a distribuição. Verifique sua conexão.");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
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

        {/* Seleção de Destino */}
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

        {/* Busca com Ícone de Ordenação */}
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

        {/* Lista de Baldes Disponíveis */}
        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
          {sortedAndFilteredBuckets.length === 0 ? (
            <div className="py-20 text-center text-gray-300 font-bold italic border-2 border-dashed border-gray-50 rounded-3xl">Nenhum balde encontrado na fábrica.</div>
          ) : (
            sortedAndFilteredBuckets.map(b => {
              const flavor = flavors.find(f => f.id === b.flavorId);
              const isSelected = selectedIds.includes(b.id);
              const flavorStock = stockSummary[b.flavorId] || 0;
              
              return (
                <button 
                  key={b.id} 
                  onClick={() => toggleSelection(b.id)} 
                  className={`w-full p-5 rounded-2xl flex justify-between items-center border transition-all active:scale-[0.98] ${
                    isSelected 
                      ? 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-lg' 
                      : 'bg-white border-fuchsia-50 text-gray-600 hover:bg-fuchsia-50/30'
                  }`}
                >
                  <div className="text-left">
                    <p className={`text-xs font-black uppercase ${isSelected ? 'text-white' : 'text-gray-800'}`}>{flavor?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[8px] font-mono ${isSelected ? 'opacity-60' : 'text-gray-300'}`}>{b.id}</span>
                      {!isSelected && (
                        <span className="text-[8px] font-black text-fuchsia-300 uppercase tracking-widest">Total: {(flavorStock/1000).toFixed(1)}kg</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-sm ${isSelected ? 'text-white' : 'text-fuchsia-600'}`}>{b.grams}g</span>
                    <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-white text-fuchsia-600 border-white' : 'border-fuchsia-100'}`}>
                      {isSelected && <CheckCircle2 size={14} />}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Resumo e Ação */}
        <div className="mt-8 pt-6 border-t border-fuchsia-50">
          <div className="flex justify-between items-end mb-6 px-2">
            <div>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Itens Selecionados</p>
              <h4 className="text-2xl font-black text-gray-800">{selectedIds.length} <span className="text-sm opacity-30 uppercase">Baldes</span></h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Massa Total</p>
              <h4 className="text-2xl font-black text-fuchsia-600">
                {(selectedIds.reduce((acc, id) => acc + (buckets.find(bk => bk.id === id)?.grams || 0), 0) / 1000).toFixed(1)}kg
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
            {isSyncing ? 'Sincronizando...' : isSuccess ? 'Transferência Concluída!' : `Enviar para ${targetStore}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;
