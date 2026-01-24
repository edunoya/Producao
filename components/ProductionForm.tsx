
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Plus, Trash2, Scale, Calculator } from 'lucide-react';
import { ProductionEntry } from '../types';

const ProductionForm: React.FC = () => {
  const { flavors, addProduction, isSyncing } = useInventory();
  const [entries, setEntries] = useState<ProductionEntry[]>([
    { flavorId: flavors[0]?.id || '', weights: [0], note: '' }
  ]);

  const handleSave = async () => {
    if (isSyncing) return;
    const hasZero = entries.some(e => e.weights.some(w => w <= 0));
    if (hasZero) {
      alert("Por favor, preencha todos os pesos corretamente.");
      return;
    }
    await addProduction(entries, new Date());
    setEntries([{ flavorId: flavors[0]?.id || '', weights: [0], note: '' }]);
    alert("Produção registrada com sucesso!");
  };

  const updateWeight = (eIdx: number, wIdx: number, val: string) => {
    const newEntries = [...entries];
    newEntries[eIdx].weights[wIdx] = Number(val);
    setEntries(newEntries);
  };

  const addBucket = (idx: number) => {
    const newEntries = [...entries];
    newEntries[idx].weights.push(0);
    setEntries(newEntries);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
        <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
          <Calculator className="text-fuchsia-500" /> Registrar Batida
        </h2>

        <div className="space-y-6">
          {entries.map((entry, eIdx) => (
            <div key={eIdx} className="p-4 bg-fuchsia-50/30 rounded-3xl border border-fuchsia-100 space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sabor</label>
                <select 
                  className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold shadow-sm outline-none"
                  value={entry.flavorId}
                  onChange={(e) => {
                    const next = [...entries];
                    next[eIdx].flavorId = e.target.value;
                    setEntries(next);
                  }}
                >
                  {flavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Baldes (em gramas)</label>
                <div className="grid grid-cols-2 gap-2">
                  {entry.weights.map((w, wIdx) => (
                    <div key={wIdx} className="relative flex items-center">
                      <input 
                        type="number"
                        placeholder="Peso g"
                        className="w-full bg-white rounded-xl p-3 pl-8 text-sm font-black text-fuchsia-600 shadow-inner outline-none"
                        value={w || ''}
                        onChange={(e) => updateWeight(eIdx, wIdx, e.target.value)}
                      />
                      <Scale size={14} className="absolute left-3 text-fuchsia-200" />
                    </div>
                  ))}
                  <button 
                    onClick={() => addBucket(eIdx)}
                    className="bg-fuchsia-100 text-fuchsia-600 rounded-xl p-3 flex items-center justify-center"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSave}
          disabled={isSyncing}
          className="w-full magenta-gradient text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-fuchsia-100 flex items-center justify-center gap-3 mt-8 active:scale-95 transition-all disabled:opacity-50"
        >
          <Save size={20} /> {isSyncing ? 'Sincronizando...' : 'Salvar Produção'}
        </button>
      </div>
    </div>
  );
};

export default ProductionForm;
