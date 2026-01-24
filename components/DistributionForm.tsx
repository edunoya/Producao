
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
// Added missing RefreshCw import
import { Truck, Package, CheckCircle2, Save, ShoppingBag, X, Send, RefreshCw } from 'lucide-react';
import { STORES } from '../constants';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, distributeBuckets, isSyncing } = useInventory();
  const [targetStore, setTargetStore] = useState(STORES[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const factoryBuckets = buckets.filter(b => b.location === 'Fábrica' && b.status === 'estoque');

  const handleSend = async () => {
    if (selectedIds.length === 0 || isSyncing) return;
    await distributeBuckets({ targetStore, bucketIds: selectedIds });
    setIsSuccess(true);
    setSelectedIds([]);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const totalGrams = selectedIds.reduce((acc, id) => {
    const b = buckets.find(bucket => bucket.id === id);
    return acc + (b?.grams || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-7 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <header className="mb-8">
          <div className="flex justify-between items-start">
             <h2 className="text-2xl font-black text-gray-800 tracking-tight">Logística de Envio</h2>
             <Truck className="text-fuchsia-400" size={28} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Fábrica para Unidades</p>
        </header>

        <div className="space-y-6">
          {/* Seleção de Destino */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2 block">Selecionar Unidade de Destino</label>
            <div className="grid grid-cols-1 gap-2">
              {STORES.map(s => (
                <button 
                  key={s}
                  onClick={() => setTargetStore(s)}
                  className={`p-5 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all flex justify-between items-center ${
                    targetStore === s 
                    ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-600 shadow-lg shadow-fuchsia-50' 
                    : 'border-fuchsia-50 bg-white text-gray-300 hover:border-fuchsia-100'
                  }`}
                >
                  {s}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${targetStore === s ? 'border-fuchsia-500 bg-fuchsia-500 text-white' : 'border-gray-100'}`}>
                    {targetStore === s && <CheckCircle2 size={12} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Baldes na Fábrica */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Carga Disponível ({factoryBuckets.length})</label>
               {selectedIds.length > 0 && (
                 <button onClick={() => setSelectedIds([])} className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                   <X size={10} /> Limpar Seleção
                 </button>
               )}
            </div>
            
            <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {factoryBuckets.length === 0 ? (
                <div className="py-20 text-center text-gray-300 font-bold italic border-2 border-dashed border-gray-50 rounded-3xl">Fábrica vazia. Registre nova produção.</div>
              ) : (
                factoryBuckets.map(b => {
                  const isSelected = selectedIds.includes(b.id);
                  const flavor = flavors.find(f => f.id === b.flavorId);
                  return (
                    <button 
                      key={b.id}
                      onClick={() => toggleSelection(b.id)}
                      className={`w-full flex justify-between items-center p-5 rounded-2xl border transition-all ${
                        isSelected 
                        ? 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-xl scale-[0.98]' 
                        : 'bg-white text-gray-600 border-fuchsia-50 hover:bg-fuchsia-50/30'
                      }`}
                    >
                      <div className="text-left">
                        <p className={`text-xs font-black uppercase ${isSelected ? 'text-white' : 'text-gray-800'}`}>{flavor?.name}</p>
                        <p className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'opacity-50' : 'text-gray-300'}`}>{b.id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-sm ${isSelected ? 'text-white' : 'text-fuchsia-600'}`}>{b.grams}g</span>
                        <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-white bg-white/20' : 'border-fuchsia-100'}`}>
                          {isSelected && <CheckCircle2 size={14} />}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Resumo e Botão de Envio */}
        <div className="mt-10 pt-8 border-t border-fuchsia-50">
          <div className="flex justify-between items-end mb-8 px-2">
             <div className="space-y-1">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Peso Estimado</span>
               <p className="text-3xl font-black text-gray-800 tracking-tighter">{(totalGrams/1000).toFixed(1)}<span className="text-lg opacity-30 ml-1">kg</span></p>
             </div>
             <div className="text-right">
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Volumes</span>
               <p className="text-3xl font-black text-fuchsia-600 tracking-tighter">{selectedIds.length}<span className="text-lg opacity-30 ml-1">un</span></p>
             </div>
          </div>

          <button 
            onClick={handleSend}
            disabled={selectedIds.length === 0 || isSyncing}
            className={`w-full py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale ${
              isSuccess ? 'bg-green-500 text-white shadow-green-100' : 'magenta-gradient text-white shadow-fuchsia-200'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="animate-spin" size={24} />
            ) : isSuccess ? (
              <>
                <CheckCircle2 size={24} />
                Carga Despachada!
              </>
            ) : (
              <>
                <Send size={20} />
                Enviar para {targetStore.split(' ')[0]}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;
