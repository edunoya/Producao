
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Plus, Scale, Calculator, RefreshCw, Search, Package, Box } from 'lucide-react';
import { ProductionEntry } from '../types';

const ProductionForm: React.FC = () => {
  const { flavors, addProductionBatch, isSyncing } = useInventory();
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
    await addProductionBatch(entries, "Produção Diária", new Date());
    setIsSuccess(true);
    setEntries([{ flavorId: flavors[0]?.id || '1', unitType: 'Balde', weights: [0] }]);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  const updateWeight = (eIdx: number, wIdx: number, val: string) => {
    const next = [...entries];
    next[eIdx].weights[wIdx] = Number(val.replace(',', '.')) || 0;
    setEntries(next);
  };

  return (
    <div className="space-y-6 pb-32 animate-in fade-in">
      <header className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nova Batida</h2>
          <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Produção Artesanal</p>
        </div>
        <div className="w-14 h-14 bg-fuchsia-50 rounded-3xl flex items-center justify-center text-fuchsia-500 shadow-inner">
          <Calculator size={28} />
        </div>
      </header>

      <div className="space-y-6">
        {entries.map((entry, eIdx) => (
          <div key={eIdx} className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm space-y-8 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Sabor do Lote</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    className="w-full bg-fuchsia-50/30 rounded-2xl px-12 py-4 text-sm font-bold outline-none border border-transparent focus:border-fuchsia-100 transition-all"
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
                </div>
                <select 
                  className="w-full bg-fuchsia-50/50 rounded-2xl p-4 text-sm font-black text-gray-700 outline-none border-none shadow-inner"
                  value={entry.flavorId}
                  onChange={e => {
                    const n = [...entries]; n[eIdx].flavorId = e.target.value; setEntries(n);
                  }}
                >
                  {filteredFlavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Formato</label>
                <div className="flex gap-3">
                  {['Balde', 'TakeAway 240ml'].map(type => (
                    <button 
                      key={type}
                      onClick={() => { const n = [...entries]; n[eIdx].unitType = type as any; setEntries(n); }}
                      className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${entry.unitType === type ? 'magenta-gradient text-white shadow-lg' : 'bg-gray-50 text-gray-300'}`}
                    >
                      {type === 'Balde' ? <Package size={14} /> : <Box size={14} />} {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pesagem Individual (g)</label>
                <button 
                  onClick={() => { const n = [...entries]; n[eIdx].weights.push(0); setEntries(n); }}
                  className="text-[10px] font-black text-fuchsia-500 uppercase flex items-center gap-1 hover:scale-105 transition-all"
                >
                  <Plus size={14} /> Adicionar Balde
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {entry.weights.map((w, wIdx) => (
                  <div key={wIdx} className="relative group">
                    <input 
                      type="number"
                      placeholder="0g"
                      className="w-full bg-fuchsia-50/30 rounded-2xl p-5 pl-12 text-lg font-black text-fuchsia-600 outline-none border border-transparent focus:border-fuchsia-200 transition-all shadow-inner"
                      value={w || ''}
                      onChange={e => updateWeight(eIdx, wIdx, e.target.value)}
                    />
                    <Scale size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200 group-focus-within:text-fuchsia-400 transition-colors" />
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
        className={`w-full py-8 rounded-[40px] font-black uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 ${isSuccess ? 'bg-green-500 text-white' : 'magenta-gradient text-white'}`}
      >
        {isSyncing ? <RefreshCw className="animate-spin" /> : isSuccess ? 'Salvo com Sucesso!' : 'Finalizar Lote'}
      </button>
    </div>
  );
};

export default ProductionForm;
