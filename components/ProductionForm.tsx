
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
      setError("⚠️ Por favor, preencha todos os pesos dos baldes com valores maiores que zero.");
      return;
    }
    
    try {
      await addProduction(entries, new Date());
      setIsSuccess(true);
      setEntries([{ flavorId: flavors[0]?.id || '1', weights: [0], note: '' }]);
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (err) {
      console.error("Erro ao salvar produção:", err);
      setError("Erro ao salvar no banco de dados. Tente novamente.");
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

  const totalGramsInBatch = entries.reduce((acc, entry) => 
    acc + entry.weights.reduce((sum, w) => sum + Number(w), 0), 0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-7 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nova Batida</h2>
            <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Fábrica Lorenza - Registro de Produção</p>
          </div>
          <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Calculator size={24} />
          </div>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {entries.map((entry, eIdx) => (
            <div key={eIdx} className="p-6 bg-fuchsia-50/30 rounded-[32px] border border-fuchsia-100/50 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Escolher Sabor do Gelato</label>
                <select 
                  className="w-full bg-white border-none rounded-2xl p-4 text-sm font-black text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-fuchsia-200 transition-all appearance-none cursor-pointer"
                  value={entry.flavorId}
                  disabled={isSyncing}
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pesagem Individual dos Baldes (g)</label>
                <div className="grid grid-cols-1 gap-3">
                  {entry.weights.map((w, wIdx) => (
                    <div key={wIdx} className="flex gap-2">
                      <div className="relative flex-1 group">
                        <input 
                          type="number"
                          placeholder="Ex: 5000"
                          disabled={isSyncing}
                          className="w-full bg-white rounded-2xl p-4 pl-12 text-lg font-black text-fuchsia-600 shadow-inner outline-none border border-transparent focus:border-fuchsia-300 transition-all"
                          value={w || ''}
                          onChange={(e) => updateWeight(eIdx, wIdx, e.target.value)}
                        />
                        <Scale size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200 group-focus-within:text-fuchsia-500 transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-fuchsia-200 uppercase">Gramas</span>
                      </div>
                      <button 
                        onClick={() => removeBucket(eIdx, wIdx)}
                        disabled={isSyncing || entry.weights.length <= 1}
                        className="p-4 bg-white text-rose-300 hover:text-rose-500 rounded-2xl border border-fuchsia-50 shadow-sm transition-all disabled:opacity-30"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => addBucket(eIdx)}
                    disabled={isSyncing}
                    className="w-full bg-white/50 border-2 border-dashed border-fuchsia-200 text-fuchsia-400 rounded-2xl p-4 flex items-center justify-center gap-2 hover:bg-fuchsia-50 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                  >
                    <Plus size={16} /> Adicionar Balde à Batida
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-fuchsia-50">
          <div className="flex justify-between items-center mb-6 px-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumo da Batida</span>
            <span className="text-xl font-black text-gray-700 tracking-tighter">{(totalGramsInBatch/1000).toFixed(1)}kg Produzidos</span>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSyncing}
            className={`w-full py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${
              isSuccess ? 'bg-green-500 text-white' : 'magenta-gradient text-white shadow-fuchsia-200'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw size={22} className="animate-spin" />
                Gravando na Nuvem...
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 size={22} />
                Produção Registrada!
              </>
            ) : (
              <>
                <Save size={22} />
                Registrar e Salvar Produção
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionForm;
