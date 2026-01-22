
import React, { useState } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Plus, Trash2, Save, Calendar, History, Search } from 'lucide-react';
import { ProductionEntry } from '../types';

const ProductionForm: React.FC = () => {
  const { addProduction, flavors, productionLogs } = useInventory();
  const [entries, setEntries] = useState<ProductionEntry[]>(() => [
    { flavorId: flavors.filter(f => f.isActive)[0]?.id || '', weights: [5000], note: '' }
  ]);

  // Filtros de Histórico
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const activeFlavors = flavors.filter(f => f.isActive);

  const addRow = () => {
    setEntries([...entries, { flavorId: activeFlavors[0]?.id || '', weights: [5000], note: '' }]);
  };

  const removeRow = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const addWeightToEntry = (index: number) => {
    const newEntries = [...entries];
    newEntries[index].weights.push(5000);
    setEntries(newEntries);
  };

  const removeWeightFromEntry = (entryIndex: number, weightIndex: number) => {
    const newEntries = [...entries];
    newEntries[entryIndex].weights.splice(weightIndex, 1);
    setEntries(newEntries);
  };

  const updateWeight = (entryIndex: number, weightIndex: number, value: number) => {
    const newEntries = [...entries];
    newEntries[entryIndex].weights[weightIndex] = value;
    setEntries(newEntries);
  };

  const updateEntryField = (index: number, field: 'flavorId' | 'note', value: string) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProduction(entries);
    setEntries([{ flavorId: activeFlavors[0]?.id || '', weights: [5000], note: '' }]);
  };

  const filteredLogs = productionLogs.filter(log => {
    if (!startDate && !endDate) return true;
    const logDate = new Date(log.date);
    logDate.setHours(0,0,0,0);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(0,0,0,0);

    return (!start || logDate >= start) && (!end || logDate <= end);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Formulário de Registro */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Nova Produção</h3>
            <p className="text-sm text-gray-400">Registre os pesos dos baldes fabricados hoje.</p>
          </div>
          <button 
            type="button" 
            onClick={addRow}
            className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-2 text-sm font-bold"
          >
            <Plus size={18} />
            <span className="hidden md:inline">Novo Sabor</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {entries.map((entry, entryIndex) => (
            <div key={entryIndex} className="p-5 bg-gray-50/50 rounded-2xl border border-gray-100 relative group animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Sabor Produzido</label>
                  <select
                    value={entry.flavorId}
                    onChange={(e) => updateEntryField(entryIndex, 'flavorId', e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-200"
                  >
                    {activeFlavors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Obs. Lote</label>
                  <input
                    type="text"
                    value={entry.note}
                    onChange={(e) => updateEntryField(entryIndex, 'note', e.target.value)}
                    placeholder="Opcional..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Pesos Individuais (gramas)</label>
                <div className="flex flex-wrap gap-2">
                  {entry.weights.map((w, weightIndex) => (
                    <div key={weightIndex} className="flex items-center bg-white border border-gray-200 rounded-xl p-1 pr-2 shadow-sm">
                      <input
                        type="number"
                        value={w}
                        onChange={(e) => updateWeight(entryIndex, weightIndex, Number(e.target.value))}
                        className="w-20 border-none bg-transparent px-2 text-sm font-bold text-gray-700 focus:ring-0 outline-none"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeWeightFromEntry(entryIndex, weightIndex)}
                        className="text-gray-300 hover:text-rose-500 transition-colors"
                        disabled={entry.weights.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => addWeightToEntry(entryIndex)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all border border-rose-100"
                  >
                    <Plus size={14} /> +1 Balde
                  </button>
                </div>
              </div>

              {entryIndex > 0 && (
                <button
                  type="button"
                  onClick={() => removeRow(entryIndex)}
                  className="absolute -top-3 -right-3 p-2 bg-white shadow-lg border border-gray-100 rounded-full text-rose-500"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          <div className="pt-6 flex flex-col md:flex-row gap-4 items-center justify-between border-t border-gray-100">
            <div className="flex items-center gap-4">
              <div className="text-gray-400 text-sm">
                Total de Baldes: <span className="font-bold text-gray-800">{entries.reduce((acc, e) => acc + e.weights.length, 0)}</span>
              </div>
              <div className="text-gray-400 text-sm">
                Peso Total: <span className="font-bold text-rose-600">{entries.reduce((acc, e) => acc + e.weights.reduce((a,b)=>a+b,0), 0) / 1000}kg</span>
              </div>
            </div>
            <button
              type="submit"
              className="w-full md:w-auto px-10 py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} />
              Salvar Lote de Produção
            </button>
          </div>
        </form>
      </div>

      {/* Histórico de Produção */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <History size={20} className="text-rose-400" />
              Histórico de Produção
            </h3>
            <p className="text-sm text-gray-400">Consulte o que foi produzido em períodos específicos.</p>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Início</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs text-gray-700 outline-none" 
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fim</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-gray-50 border-none rounded-lg px-3 py-1.5 text-xs text-gray-700 outline-none" 
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden border border-gray-50 rounded-2xl">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase">
              <tr>
                <th className="px-4 py-3">Sabor</th>
                <th className="px-4 py-3 text-center">Baldes</th>
                <th className="px-4 py-3 text-center">Peso Total</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm italic">Nenhum registro no período.</td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const flavor = flavors.find(f => f.id === log.flavorId);
                  return (
                    <tr key={log.id} className="text-sm text-gray-700 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-bold">{flavor?.name}</td>
                      <td className="px-4 py-3 text-center">{log.bucketCount} un</td>
                      <td className="px-4 py-3 text-center text-rose-500 font-semibold">{log.totalGrams / 1000} kg</td>
                      <td className="px-4 py-3 text-xs text-gray-400 flex items-center gap-1.5">
                        <Calendar size={12} />
                        {log.date.toLocaleDateString()} {log.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductionForm;
