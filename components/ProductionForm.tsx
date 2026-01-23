
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Plus, Trash2, Save, Calendar, Search, History, ChevronDown } from 'lucide-react';
import { ProductionEntry, Flavor } from '../types';

const SearchableFlavorSelect: React.FC<{
  value: string;
  onChange: (id: string) => void;
  flavors: Flavor[];
}> = ({ value, onChange, flavors }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedFlavor = flavors.find(f => f.id === value);

  const filtered = useMemo(() => {
    return flavors.filter(f => 
      f.name.toLowerCase().includes(search.toLowerCase()) || 
      f.initials.toLowerCase().includes(search.toLowerCase())
    );
  }, [flavors, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-fuchsia-100 rounded-xl px-4 py-3 text-sm font-semibold flex justify-between items-center cursor-pointer hover:border-fuchsia-200 transition-colors"
      >
        <span className={selectedFlavor ? 'text-gray-800' : 'text-gray-400'}>
          {selectedFlavor ? selectedFlavor.name : 'Selecione o sabor...'}
        </span>
        <ChevronDown size={16} className={`text-fuchsia-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-fuchsia-100 rounded-xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-300" />
            <input 
              autoFocus
              type="text" 
              placeholder="Digite para buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-fuchsia-50/50 rounded-lg pl-9 pr-4 py-2 text-xs outline-none font-bold text-gray-700"
            />
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filtered.length > 0 ? filtered.map(f => (
              <div 
                key={f.id}
                onClick={() => {
                  onChange(f.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="flex items-center justify-between px-3 py-2 hover:bg-fuchsia-50 rounded-lg cursor-pointer transition-colors"
              >
                <span className="text-xs font-bold text-gray-700">{f.name}</span>
                <span className="text-[10px] font-mono text-fuchsia-300 bg-fuchsia-50 px-1.5 py-0.5 rounded">{f.initials}</span>
              </div>
            )) : (
              <div className="text-center py-4 text-xs text-gray-300 italic">Sabor não encontrado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProductionForm: React.FC = () => {
  const { addProduction, flavors, productionLogs } = useInventory();
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  
  const activeFlavors = useMemo(() => {
    return flavors
      .filter(f => f.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [flavors]);

  // Iniciamos com peso 0 para forçar a digitação do peso real
  const [entries, setEntries] = useState<ProductionEntry[]>(() => [
    { flavorId: activeFlavors[0]?.id || '', weights: [0], note: '' }
  ]);

  const addRow = () => {
    setEntries([...entries, { flavorId: activeFlavors[0]?.id || '', weights: [0], note: '' }]);
  };

  const removeRow = (index: number) => {
    if (entries.length > 1) setEntries(entries.filter((_, i) => i !== index));
  };

  const updateWeight = (entryIndex: number, weightIndex: number, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    const newEntries = [...entries];
    newEntries[entryIndex].weights[weightIndex] = numValue;
    setEntries(newEntries);
  };

  const updateEntryField = (index: number, field: 'flavorId' | 'note', value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    const hasInvalidWeights = entries.some(e => e.weights.some(w => w <= 0));
    if (hasInvalidWeights) {
      alert("Por favor, preencha todos os pesos dos baldes corretamente.");
      return;
    }

    const dateObj = new Date(productionDate);
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    addProduction(entries, dateObj);
    setEntries([{ flavorId: activeFlavors[0]?.id || '', weights: [0], note: '' }]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-fuchsia-50 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Registrar Batida</h3>
            <p className="text-sm text-gray-400">Novo lote produzido na Lorenza.</p>
          </div>
          <div className="bg-fuchsia-50 p-3 rounded-2xl flex items-center gap-2 border border-fuchsia-100">
            <Calendar size={18} className="text-fuchsia-500" />
            <input 
              type="date" 
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-fuchsia-600 outline-none p-0 cursor-pointer"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {entries.map((entry, entryIndex) => (
            <div key={entryIndex} className="p-6 bg-fuchsia-50/20 rounded-2xl border border-fuchsia-50/50 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Sabor Batido</label>
                  <SearchableFlavorSelect 
                    value={entry.flavorId}
                    onChange={(id) => updateEntryField(entryIndex, 'flavorId', id)}
                    flavors={activeFlavors}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Nota do Lote</label>
                  <input
                    type="text"
                    value={entry.note}
                    onChange={(e) => updateEntryField(entryIndex, 'note', e.target.value)}
                    placeholder="Opcional: ex: Leite novo..."
                    className="w-full bg-white border border-fuchsia-100 rounded-xl px-4 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase ml-1">Baldes do Sabor (gramas)</label>
                <div className="flex flex-wrap gap-2">
                  {entry.weights.map((w, weightIndex) => (
                    <div key={weightIndex} className="flex items-center bg-white border border-fuchsia-100 rounded-xl px-2 py-1 shadow-sm">
                      <input
                        type="number"
                        placeholder="Peso (g)"
                        value={w === 0 ? '' : w}
                        onChange={(e) => updateWeight(entryIndex, weightIndex, e.target.value)}
                        className="w-24 border-none bg-transparent px-2 text-sm font-black text-fuchsia-700 outline-none placeholder:font-normal placeholder:text-gray-300"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const newEntries = [...entries];
                          newEntries[entryIndex].weights.splice(weightIndex, 1);
                          setEntries(newEntries);
                        }}
                        className="p-1 text-gray-300 hover:text-rose-400"
                        disabled={entry.weights.length === 1}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => {
                      const newEntries = [...entries];
                      newEntries[entryIndex].weights.push(0);
                      setEntries(newEntries);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-fuchsia-100 text-fuchsia-600 rounded-xl text-[10px] font-black uppercase hover:bg-fuchsia-200 transition-all"
                  >
                    + Balde
                  </button>
                </div>
              </div>

              {entryIndex > 0 && (
                <button
                  type="button"
                  onClick={() => removeRow(entryIndex)}
                  className="absolute -top-3 -right-3 p-2 bg-white shadow-md border border-fuchsia-50 rounded-full text-rose-400 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          <div className="flex justify-center pt-2">
            <button 
              type="button" 
              onClick={addRow}
              className="flex items-center gap-2 text-xs font-bold text-fuchsia-600 bg-fuchsia-50 px-6 py-3 rounded-2xl border border-fuchsia-100 hover:bg-fuchsia-100 transition-all uppercase tracking-widest"
            >
              <Plus size={16} /> Outro Sabor na Mesma Batida
            </button>
          </div>

          <div className="pt-8 border-t border-fuchsia-50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Total de Baldes</span>
                <span className="text-xl font-black text-gray-800">{entries.reduce((acc, e) => acc + e.weights.length, 0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Massa Total</span>
                <span className="text-xl font-black text-fuchsia-600">{entries.reduce((acc, e) => acc + e.weights.reduce((a,b)=>a+b,0), 0) / 1000}kg</span>
              </div>
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-12 py-4 magenta-gradient text-white rounded-2xl font-black shadow-xl shadow-fuchsia-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              <Save size={20} /> Salvar Produção
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
           <History size={18} className="text-fuchsia-400" />
           Últimas Batidas
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
          {productionLogs.slice(0, 10).map(log => {
             const flavor = flavors.find(f => f.id === log.flavorId);
             return (
               <div key={log.id} className="flex items-center justify-between p-3 bg-fuchsia-50/10 rounded-xl border border-fuchsia-50">
                 <div className="flex items-center gap-3">
                   <div className="text-[10px] font-bold text-fuchsia-400 w-12">{log.date.toLocaleDateString().slice(0,5)}</div>
                   <div className="text-sm font-bold text-gray-700">{flavor?.name}</div>
                 </div>
                 <div className="text-xs font-bold text-gray-400">{log.bucketCount} un | {log.totalGrams/1000}kg</div>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
};

export default ProductionForm;
