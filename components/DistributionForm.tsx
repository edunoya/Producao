
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, Package, CheckCircle2, X, Send, RefreshCw, Search, ArrowDownAZ, SortAsc } from 'lucide-react';
import { STORES } from '../constants';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, distributeBuckets, isSyncing } = useInventory();
  const [targetStore, setTargetStore] = useState(STORES[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Logistics logic: Sort flavors by current stock on factory (most abundant first)
  const factoryBuckets = useMemo(() => {
    return buckets.filter(b => b.location === 'Fábrica' && b.status === 'estoque');
  }, [buckets]);

  const stockSummary = useMemo(() => {
    const summary: any = {};
    factoryBuckets.forEach(b => {
      summary[b.flavorId] = (summary[b.flavorId] || 0) + b.grams;
    });
    return summary;
  }, [factoryBuckets]);

  const sortedAndFilteredBuckets = useMemo(() => {
    return factoryBuckets
      .filter(b => {
        const f = flavors.find(fl => fl.id === b.flavorId);
        return f?.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => (stockSummary[b.flavorId] || 0) - (stockSummary[a.flavorId] || 0));
  }, [factoryBuckets, flavors, searchTerm, stockSummary]);

  const handleSend = async () => {
    if (selectedIds.length === 0 || isSyncing) return;
    try {
      await distributeBuckets({ targetStore, bucketIds: selectedIds });
      setIsSuccess(true);
      setSelectedIds([]);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (e) {
      alert("Erro ao enviar");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Distribuição</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Sugerido por Volume</p>
          </div>
          <Truck className="text-fuchsia-400" size={32} />
        </header>

        {/* Target Select */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {STORES.map(s => (
            <button key={s} onClick={() => setTargetStore(s)} className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${targetStore === s ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-600' : 'border-gray-50 text-gray-300'}`}>
              {s.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Buscar balde..." 
            className="w-full bg-fuchsia-50/30 rounded-2xl px-12 py-4 text-sm font-bold outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
        </div>

        {/* Bucket List */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {sortedAndFilteredBuckets.map(b => {
            const flavor = flavors.find(f => f.id === b.flavorId);
            const isSelected = selectedIds.includes(b.id);
            return (
              <button key={b.id} onClick={() => toggleSelection(b.id)} className={`w-full p-4 rounded-2xl flex justify-between items-center border transition-all ${isSelected ? 'bg-fuchsia-600 text-white border-fuchsia-700' : 'bg-white border-gray-50 text-gray-600 hover:bg-fuchsia-50/20'}`}>
                 <div className="text-left">
                    <p className="text-xs font-black uppercase">{flavor?.name}</p>
                    <p className={`text-[8px] font-mono ${isSelected ? 'opacity-50' : 'text-gray-300'}`}>{b.id}</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="font-black text-xs">{b.grams}g</span>
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${isSelected ? 'bg-white text-fuchsia-600 border-white' : 'border-fuchsia-50'}`}>
                      {isSelected && <CheckCircle2 size={12} />}
                    </div>
                 </div>
              </button>
            );
          })}
        </div>

        <button 
          onClick={handleSend}
          disabled={selectedIds.length === 0 || isSyncing}
          className={`w-full py-6 rounded-[32px] mt-8 font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-30 ${
            isSuccess ? 'bg-green-500 text-white shadow-green-100' : 'magenta-gradient text-white shadow-fuchsia-200'
          }`}
        >
          {isSyncing ? <RefreshCw size={24} className="animate-spin" /> : isSuccess ? <CheckCircle2 size={24} /> : <Send size={24} />}
          {isSyncing ? 'Enviando...' : isSuccess ? 'Carga Enviada!' : `Enviar para ${targetStore}`}
        </button>
      </div>
    </div>
  );
};

export default DistributionForm;
