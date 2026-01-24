
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, Package, CheckCircle2, ArrowRight, Save } from 'lucide-react';
import { STORES } from '../constants';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, distributeBuckets, isSyncing } = useInventory();
  const [targetStore, setTargetStore] = useState(STORES[0]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const factoryBuckets = buckets.filter(b => b.location === 'Fábrica' && b.status === 'estoque');

  const handleSend = async () => {
    if (selectedIds.length === 0 || isSyncing) return;
    await distributeBuckets({ targetStore, bucketIds: selectedIds });
    setSelectedIds([]);
    alert("Baldes enviados com sucesso!");
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
        <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <Truck className="text-fuchsia-500" /> Enviar para Loja
        </h2>

        <div className="mb-8">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Selecionar Destino</label>
          <div className="grid grid-cols-1 gap-2">
            {STORES.map(s => (
              <button 
                key={s}
                onClick={() => setTargetStore(s)}
                className={`p-4 rounded-2xl border-2 font-black text-sm uppercase transition-all flex justify-between items-center ${
                  targetStore === s ? 'border-fuchsia-500 bg-fuchsia-50 text-fuchsia-600' : 'border-fuchsia-50 text-gray-400'
                }`}
              >
                {s}
                {targetStore === s && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Baldes na Fábrica ({factoryBuckets.length})</label>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {factoryBuckets.map(b => (
              <button 
                key={b.id}
                onClick={() => toggleSelection(b.id)}
                className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all ${
                  selectedIds.includes(b.id) ? 'bg-fuchsia-500 text-white border-fuchsia-600' : 'bg-white text-gray-600 border-fuchsia-50'
                }`}
              >
                <div className="text-left">
                  <p className="text-xs font-black uppercase">{flavors.find(f => f.id === b.flavorId)?.name}</p>
                  <p className="text-[10px] opacity-60">{b.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{b.grams}g</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.includes(b.id) ? 'border-white' : 'border-gray-100'}`}>
                    {selectedIds.includes(b.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSend}
          disabled={selectedIds.length === 0 || isSyncing}
          className="w-full magenta-gradient text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-fuchsia-100 flex items-center justify-center gap-3 mt-10 active:scale-95 transition-all disabled:opacity-30"
        >
          <Save size={20} /> Enviar {selectedIds.length} Baldes
        </button>
      </div>
    </div>
  );
};

export default DistributionForm;
