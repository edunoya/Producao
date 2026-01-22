
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, Scale, Package, CheckCircle2, Store, Info } from 'lucide-react';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, distributeBuckets } = useInventory();
  const [targetStore, setTargetStore] = useState<'Campo Duna' | 'Casa Kimo' | 'Rosa'>('Campo Duna');
  const [selectedFlavorId, setSelectedFlavorId] = useState(flavors[0]?.id);
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);

  const stores: ('Campo Duna' | 'Casa Kimo' | 'Rosa')[] = ['Campo Duna', 'Casa Kimo', 'Rosa'];

  const availableBuckets = buckets.filter(b => 
    b.location === 'Fábrica' && b.flavorId === selectedFlavorId
  );

  const toggleBucket = (id: string) => {
    setSelectedBucketIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSend = () => {
    if (selectedBucketIds.length === 0) return;
    distributeBuckets({ targetStore, bucketIds: selectedBucketIds });
    setSelectedBucketIds([]);
  };

  // Resumo de Distribuição Total
  const getStoreSummary = (store: string) => {
    const storeBuckets = buckets.filter(b => b.location === store);
    return {
      count: storeBuckets.length,
      weight: storeBuckets.reduce((acc, b) => acc + b.grams, 0) / 1000
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Resumo de Lojas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stores.map(s => {
          const summary = getStoreSummary(s);
          return (
            <div key={s} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center">
                <Store size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{s}</p>
                <p className="text-sm font-bold text-gray-800">{summary.count} baldes <span className="text-gray-400 font-normal">({summary.weight}kg)</span></p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Lista de Sabores Mini */}
          <div className="md:w-1/3 border-r border-gray-50 pr-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 px-2">1. Sabores</h4>
            <div className="flex flex-col gap-1.5 max-h-[450px] overflow-y-auto custom-scrollbar pr-2">
              {flavors.filter(f => f.isActive).map(f => {
                const count = buckets.filter(b => b.flavorId === f.id && b.location === 'Fábrica').length;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFlavorId(f.id); setSelectedBucketIds([]); }}
                    className={`flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      selectedFlavorId === f.id ? 'bg-rose-50 border border-rose-100' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="truncate">
                      <p className={`text-xs font-bold truncate ${selectedFlavorId === f.id ? 'text-rose-600' : 'text-gray-700'}`}>{f.name}</p>
                      <p className="text-[9px] text-gray-400">{count} em estoque</p>
                    </div>
                    <span className="text-[9px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{f.initials}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção de Baldes e Envio */}
          <div className="md:w-2/3 space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-gray-400 uppercase">2. Selecionar para Enviar</h4>
              <select 
                value={targetStore}
                onChange={(e) => setTargetStore(e.target.value as any)}
                className="bg-gray-100 border-none rounded-lg px-3 py-1.5 text-xs font-bold outline-none"
              >
                {stores.map(s => <option key={s} value={s}>Para: {s}</option>)}
              </select>
            </div>

            {availableBuckets.length === 0 ? (
              <div className="h-48 border-2 border-dashed border-gray-50 rounded-2xl flex flex-col items-center justify-center text-gray-300">
                <Package size={32} className="mb-2" />
                <p className="text-xs">Estoque vazio deste sabor na fábrica</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {availableBuckets.map(b => (
                  <button
                    key={b.id}
                    onClick={() => toggleBucket(b.id)}
                    className={`p-3 rounded-xl border-2 text-center relative transition-all ${
                      selectedBucketIds.includes(b.id) ? 'border-rose-400 bg-rose-50' : 'border-gray-50 bg-white'
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-700">{b.grams}g</p>
                    <p className="text-[8px] font-mono text-gray-400 mt-1">{b.id}</p>
                    {selectedBucketIds.includes(b.id) && <CheckCircle2 size={14} className="absolute top-1 right-1 text-rose-500" />}
                  </button>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                <span className="font-bold text-rose-500">{selectedBucketIds.length}</span> baldes selecionados
              </div>
              <button
                onClick={handleSend}
                disabled={selectedBucketIds.length === 0}
                className="bg-sky-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-sky-100 flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Truck size={18} />
                Enviar para {targetStore}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;
