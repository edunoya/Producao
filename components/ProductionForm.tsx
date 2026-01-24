
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Plus, Trash2, Scale, Calculator, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { ProductionEntry } from '../types';

const ProductionForm: React.FC = () => {
  const { flavors, addProduction, isSyncing } = useInventory();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ProductionEntry[]>([
    { flavorId: flavors[0]?.id || '1', weights: [0], note: '' }
  ]);

  const handleSave = async () => {
    if (isSyncing) return;
    setError(null);
    const hasZero = entries.some(e => e.weights.some(w => w <= 0));
    if (hasZero) {
      setError("⚠️ Insira o peso de todos os baldes produzidos.");
      return;
    }
    
    try {
      await addProduction(entries, new Date());
      setIsSuccess(true);
      setEntries([{ flavorId: flavors[0]?.id || '1', weights: [0], note: '' }]);
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (err) {
      setError("Erro ao salvar. Verifique sua conexão.");
    }
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

  const removeBucket = (eIdx: number, wIdx: number) => {
    if (entries[eIdx].weights.length === 1) return;
    const next = [...entries];
    next[eIdx].weights.splice(wIdx, 1);
    setEntries(next);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-7 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nova Batida</h2>
            <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Fábrica Lorenza</p>
          </div>
          <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Calculator size={24} />
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {entries.map((entry, eIdx) => (
            <div key={eIdx} className="p-6 bg-fuchsia-50/30 rounded-[32px] border border-fuchsia-100/50 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Sabor</label>
                <select 
                  className="w-full bg-white border-none rounded-2xl p-4 text-sm font-black text-gray-700 shadow-sm outline-none appearance-none"
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

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Baldes (gramas)</label>
                <div className="grid grid-cols-1 gap-3">
                  {entry.weights.map((w, wIdx) => (
                    <div key={wIdx} className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type="number"
                          placeholder="Ex: 5000"
                          className="w-full bg-white rounded-2xl p-4 pl-12 text-lg font-black text-fuchsia-600 shadow-inner outline-none border border-transparent focus:border-fuchsia-300"
                          value={w || ''}
                          onChange={(e) => updateWeight(eIdx, wIdx, e.target.value)}
                        />
                        <Scale size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
                      </div>
                      <button onClick={() => removeBucket(eIdx, wIdx)} className="p-4 bg-white text-rose-300 hover:text-rose-500 rounded-2xl border border-fuchsia-50"><Trash2 size={20} /></button>
                    </div>
                  ))}
                  <button 
                    onClick={() => addBucket(eIdx)}
                    className="w-full bg-white/50 border-2 border-dashed border-fuchsia-200 text-fuchsia-400 rounded-2xl p-4 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest"
                  >
                    <Plus size={16} /> Adicionar Balde
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-fuchsia-50">
          <button 
            onClick={handleSave}
            disabled={isSyncing}
            className={`w-full py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${
              isSuccess ? 'bg-green-500 text-white' : 'magenta-gradient text-white shadow-fuchsia-200'
            }`}
          >
            {isSyncing ? <RefreshCw size={22} className="animate-spin" /> : isSuccess ? <CheckCircle2 size={22} /> : <Save size={22} />}
            {isSyncing ? 'Salvando...' : isSuccess ? 'Sucesso!' : 'Salvar Produção'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionForm;
