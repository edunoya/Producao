
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Plus, Trash2, Scale, Calculator, CheckCircle2, RefreshCw, Search, X, ChevronRight, Package, Box } from 'lucide-react';
import { ProductionEntry, UnitType } from '../types';

const ProductionForm: React.FC = () => {
  const { flavors, categories, addProductionBatch, isSyncing } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'novo' | 'historico'>('novo');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [entries, setEntries] = useState<ProductionEntry[]>([
    { flavorId: flavors[0]?.id || '1', unitType: 'Balde', weights: [0] }
  ]);

  const filteredFlavors = useMemo(() => {
    return flavors.filter(f => f.isActive && f.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [flavors, searchTerm]);

  const handleSave = async () => {
    if (isSyncing) return;
    try {
      await addProductionBatch(entries, "Produção Diária", new Date());
      setIsSuccess(true);
      setEntries([{ flavorId: flavors[0]?.id || '1', unitType: 'Balde', weights: [0] }]);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (e) { alert("Erro ao salvar produção."); }
  };

  const updateWeight = (eIdx: number, wIdx: number, val: string) => {
    const next = [...entries];
    next[eIdx].weights[wIdx] = parseFloat(val.replace(',', '.')) || 0;
    setEntries(next);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm animate-in fade-in">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nova Batida</h2>
            <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Produção de Gelato</p>
          </div>
          <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Calculator size={24} />
          </div>
        </header>

        <div className="space-y-6">
          {entries.map((entry, eIdx) => (
            <div key={eIdx} className="p-6 bg-fuchsia-50/20 rounded-[32px] border border-fuchsia-100/30 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Sabor (Pesquisa)</label>
                   <div className="relative">
                      <input 
                        type="text"
                        placeholder="Pesquisar sabor..."
                        className="w-full bg-white rounded-xl px-10 py-3 text-sm font-bold shadow-sm outline-none border border-transparent focus:border-fuchsia-200"
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200" />
                   </div>
                   <select 
                     className="w-full bg-white border-none rounded-xl p-3 text-sm font-black text-gray-700 shadow-sm outline-none"
                     value={entry.flavorId}
                     onChange={(e) => {
                       const next = [...entries];
                       next[eIdx].flavorId = e.target.value;
                       setEntries(next);
                     }}
                   >
                     {filteredFlavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tipo de Unidade</label>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => { const n = [...entries]; n[eIdx].unitType = 'Balde'; setEntries(n); }}
                       className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${entry.unitType === 'Balde' ? 'bg-fuchsia-600 text-white' : 'bg-white text-gray-300'}`}
                     >
                       <Package size={14} /> Balde
                     </button>
                     <button 
                       onClick={() => { const n = [...entries]; n[eIdx].unitType = 'TakeAway 240ml'; setEntries(n); }}
                       className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${entry.unitType === 'TakeAway 240ml' ? 'bg-fuchsia-600 text-white' : 'bg-white text-gray-300'}`}
                     >
                       <Box size={14} /> 240ml
                     </button>
                   </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pesos do Lote ({entry.unitType === 'Balde' ? 'g' : 'un'})</label>
                  <button onClick={() => { const n = [...entries]; n[eIdx].weights.push(0); setEntries(n); }} className="text-[9px] font-black text-fuchsia-500 uppercase flex items-center gap-1">
                    <Plus size={10} /> Novo Balde
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {entry.weights.map((w, wIdx) => (
                    <div key={wIdx} className="relative">
                      <input 
                        type="number"
                        className="w-full bg-white rounded-xl p-3 pl-8 text-sm font-black text-fuchsia-600 shadow-inner outline-none border border-transparent focus:border-fuchsia-200"
                        value={w || ''}
                        onChange={(e) => updateWeight(eIdx, wIdx, e.target.value)}
                      />
                      <Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={handleSave}
          disabled={isSyncing}
          className={`w-full py-6 mt-8 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${isSuccess ? 'bg-green-500 text-white' : 'magenta-gradient text-white'}`}
        >
          {isSyncing ? <RefreshCw className="animate-spin" /> : isSuccess ? <CheckCircle2 /> : <Save />}
          {isSyncing ? 'Gravando...' : isSuccess ? 'Sucesso!' : 'Salvar Produção'}
        </button>
      </div>
    </div>
  );
};

export default ProductionForm;
