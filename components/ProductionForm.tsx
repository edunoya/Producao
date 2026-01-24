
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Plus, Trash2, Scale, Calculator, CheckCircle2, RefreshCw, Search, X, ChevronRight } from 'lucide-react';
import { ProductionEntry } from '../types';

const ProductionForm: React.FC = () => {
  const { flavors, categories, addProductionBatch, isSyncing } = useInventory();
  const [isSuccess, setIsSuccess] = useState(false);
  const [batchNote, setBatchNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Iniciamos com um array que pode conter valores undefined para representar o campo vazio
  const [entries, setEntries] = useState<ProductionEntry[]>([
    { flavorId: flavors[0]?.id || '1', weights: [0] } // 0 será tratado como vazio no input
  ]);

  const groupedFlavors = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const list = flavors.filter(f => f.isActive && f.name.toLowerCase().includes(term));
    
    const grouped: { [key: string]: typeof list } = {};
    list.forEach(f => {
      const catName = categories.find(c => c.id === f.categoryIds[0])?.name || 'Geral';
      if (!grouped[catName]) grouped[catName] = [];
      grouped[catName].push(f);
    });

    // Ordenar categorias alfabeticamente e sabores dentro delas
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, fs]) => [cat, fs.sort((a, b) => a.name.localeCompare(b.name))]) as [string, typeof list][];
  }, [flavors, searchTerm, categories]);

  const handleSave = async () => {
    if (isSyncing) return;
    
    const hasInvalid = entries.some(e => e.weights.some(w => w === null || w === undefined || w <= 0));
    if (hasInvalid) {
      alert("⚠️ Por favor, preencha todos os pesos dos baldes com valores maiores que zero.");
      return;
    }
    
    await addProductionBatch(entries, batchNote, new Date());
    setIsSuccess(true);
    setEntries([{ flavorId: flavors[0]?.id || '1', weights: [0] }]);
    setBatchNote('');
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const addFlavorToBatch = () => {
    setEntries([...entries, { flavorId: flavors[0]?.id || '1', weights: [0] }]);
  };

  const removeFlavorFromBatch = (idx: number) => {
    if (entries.length === 1) return;
    setEntries(entries.filter((_, i) => i !== idx));
  };

  const updateWeight = (eIdx: number, wIdx: number, val: string) => {
    const next = [...entries];
    next[eIdx].weights[wIdx] = val === '' ? 0 : Number(val);
    setEntries(next);
  };

  const addBucketToFlavor = (eIdx: number) => {
    const next = [...entries];
    next[eIdx].weights.push(0);
    setEntries(next);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Nova Batida</h2>
            <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">Produção Multi-Sabor</p>
          </div>
          <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
            <Calculator size={24} />
          </div>
        </header>

        {/* Busca Global de Sabores (para orientar a seleção) */}
        <div className="relative mb-6">
          <input 
            type="text" 
            placeholder="Filtrar sabores..." 
            className="w-full bg-fuchsia-50/30 rounded-2xl px-12 py-3 text-sm font-bold outline-none border border-transparent focus:border-fuchsia-100 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
        </div>

        {/* Observação do Lote */}
        <div className="mb-8">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-2">Observação do Lote</label>
          <textarea 
            placeholder="Ex: Leite novo, temperatura ambiente 28ºC..."
            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold shadow-inner outline-none h-20 resize-none focus:ring-2 focus:ring-fuchsia-50 transition-all"
            value={batchNote}
            onChange={(e) => setBatchNote(e.target.value)}
          />
        </div>

        {/* Entries List */}
        <div className="space-y-6">
          {entries.map((entry, eIdx) => (
            <div key={eIdx} className="p-6 bg-fuchsia-50/20 rounded-[32px] border border-fuchsia-100/30 relative animate-in fade-in slide-in-from-bottom-2">
              <button 
                onClick={() => removeFlavorFromBatch(eIdx)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-white text-rose-400 rounded-full flex items-center justify-center shadow-md border border-rose-50 hover:bg-rose-500 hover:text-white transition-all z-10"
              >
                <X size={16} />
              </button>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Sabor {eIdx + 1}</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-white border-none rounded-2xl p-4 text-sm font-black text-gray-700 shadow-sm outline-none appearance-none cursor-pointer"
                      value={entry.flavorId}
                      onChange={(e) => {
                        const next = [...entries];
                        next[eIdx].flavorId = e.target.value;
                        setEntries(next);
                      }}
                    >
                      {groupedFlavors.map(([cat, fs]) => (
                        <optgroup key={cat} label={cat}>
                          {fs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-fuchsia-200 pointer-events-none">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Baldes (gramas)</label>
                    <button onClick={() => addBucketToFlavor(eIdx)} className="text-[9px] font-black text-fuchsia-500 uppercase flex items-center gap-1 hover:text-fuchsia-700 transition-colors">
                      <Plus size={10} /> Adicionar Balde
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {entry.weights.map((w, wIdx) => (
                      <div key={wIdx} className="relative group">
                        <input 
                          type="number"
                          placeholder="Peso em gramas..."
                          className="w-full bg-white rounded-xl p-3 pl-10 text-sm font-black text-fuchsia-600 shadow-inner outline-none border border-transparent focus:border-fuchsia-200 transition-all"
                          value={w === 0 ? '' : w}
                          onChange={(e) => updateWeight(eIdx, wIdx, e.target.value)}
                        />
                        <Scale size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200 group-focus-within:text-fuchsia-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          <button 
            onClick={addFlavorToBatch}
            className="w-full py-4 bg-white border-2 border-dashed border-fuchsia-200 text-fuchsia-400 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-fuchsia-50 transition-all active:scale-95"
          >
            <Plus size={18} /> Adicionar Outro Sabor no Lote
          </button>

          <button 
            onClick={handleSave}
            disabled={isSyncing}
            className={`w-full py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${
              isSuccess ? 'bg-green-500 text-white shadow-green-100' : 'magenta-gradient text-white shadow-fuchsia-200'
            }`}
          >
            {isSyncing ? <RefreshCw size={22} className="animate-spin" /> : isSuccess ? <CheckCircle2 size={22} /> : <Save size={22} />}
            {isSyncing ? 'Gravando...' : isSuccess ? 'Produção Salva!' : 'Finalizar e Salvar Lote'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionForm;
