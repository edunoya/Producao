
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Save, Plus, Trash2, Scale, Calculator, CheckCircle2, RefreshCw, Search, X, ChevronRight, History, Edit2, Filter, AlertCircle, FileText } from 'lucide-react';
import { ProductionEntry, ProductionLog } from '../types';

const ProductionForm: React.FC = () => {
  const { flavors, categories, buckets, productionLogs, addProductionBatch, updateProductionBatch, deleteProductionBatch, isSyncing } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'novo' | 'historico'>('novo');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [batchNote, setBatchNote] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyFlavorFilter, setHistoryFlavorFilter] = useState<string>('all');
  
  const [entries, setEntries] = useState<ProductionEntry[]>([
    { flavorId: flavors[0]?.id || '1', weights: [0] }
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

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, fs]) => [cat, fs.sort((a, b) => a.name.localeCompare(b.name))]) as [string, typeof list][];
  }, [flavors, searchTerm, categories]);

  const filteredHistory = useMemo(() => {
    if (historyFlavorFilter === 'all') return productionLogs;
    return productionLogs.filter(log => 
      log.entries.some(e => e.flavorId === historyFlavorFilter)
    );
  }, [productionLogs, historyFlavorFilter]);

  const handleSave = async () => {
    if (isSyncing) return;
    setErrorMsg(null);
    
    const hasInvalid = entries.some(e => e.weights.some(w => w === null || w === undefined || w <= 0));
    if (hasInvalid) {
      setErrorMsg("⚠️ Por favor, informe pesos válidos (maiores que zero) para todos os baldes.");
      return;
    }
    
    try {
      if (editingLogId) {
        await updateProductionBatch(editingLogId, entries, batchNote);
      } else {
        await addProductionBatch(entries, batchNote, new Date());
      }
      
      setIsSuccess(true);
      resetForm();
      setTimeout(() => {
        setIsSuccess(false);
        if (editingLogId) setActiveTab('historico');
      }, 2000);
    } catch (e: any) {
      setErrorMsg(e.message || "Falha técnica ao salvar. Verifique sua rede.");
    }
  };

  const resetForm = () => {
    setEntries([{ flavorId: flavors[0]?.id || '1', weights: [0] }]);
    setBatchNote('');
    setEditingLogId(null);
    setErrorMsg(null);
  };

  const handleEditLog = (log: ProductionLog) => {
    setEditingLogId(log.id);
    setBatchNote(log.batchNote || '');
    const batchBuckets = buckets.filter(b => b.note === log.id);
    const formEntries: ProductionEntry[] = log.entries.map(e => {
      const flavorWeights = batchBuckets
        .filter(b => b.flavorId === e.flavorId)
        .map(b => b.grams);
      return { flavorId: e.flavorId, weights: flavorWeights.length > 0 ? flavorWeights : [0] };
    });
    setEntries(formEntries);
    setActiveTab('novo');
  };

  const updateWeight = (eIdx: number, wIdx: number, val: string) => {
    const next = [...entries];
    const parsed = val === '' ? 0 : parseFloat(val.replace(',', '.'));
    next[eIdx].weights[wIdx] = isNaN(parsed) ? 0 : parsed;
    setEntries(next);
  };

  const addFlavorToBatch = () => {
    setEntries([...entries, { flavorId: flavors[0]?.id || '1', weights: [0] }]);
  };

  return (
    <div className="space-y-6 pb-20">
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto opacity-40 hover:opacity-100 transition-opacity"><X size={14} /></button>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => { setActiveTab('novo'); if(!editingLogId) resetForm(); }}
          className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'novo' ? 'bg-fuchsia-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-fuchsia-50'}`}
        >
          {editingLogId ? 'Editando Lote' : 'Novo Lote'}
        </button>
        <button 
          onClick={() => setActiveTab('historico')}
          className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${activeTab === 'historico' ? 'bg-fuchsia-600 text-white shadow-lg' : 'bg-white text-gray-400 border border-fuchsia-50'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <History size={14} /> Histórico
          </div>
        </button>
      </div>

      {activeTab === 'novo' ? (
        <div className="bg-white p-6 rounded-[40px] border border-fuchsia-50 shadow-sm animate-in fade-in">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">{editingLogId ? 'Ajustar Lote' : 'Nova Batida'}</h2>
              <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mt-1">
                {editingLogId ? 'Ajuste de pesos e observações' : 'Produção de Gelato'}
              </p>
            </div>
            <div className="w-12 h-12 bg-fuchsia-50 rounded-2xl flex items-center justify-center text-fuchsia-500 shadow-inner">
              <Calculator size={24} />
            </div>
          </header>

          <div className="relative mb-6">
            <input 
              type="text" 
              placeholder="Pesquisa rápida de sabores..." 
              className="w-full bg-fuchsia-50/30 rounded-2xl px-12 py-3 text-sm font-bold outline-none border border-transparent focus:border-fuchsia-100 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
          </div>

          <div className="mb-8">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-2">Observação do Lote</label>
            <div className="relative">
              <textarea 
                placeholder="Ex: Novos insumos, temp ambiente..."
                className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold shadow-inner outline-none h-24 resize-none focus:ring-2 focus:ring-fuchsia-50 transition-all"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
              />
              <FileText size={18} className="absolute left-4 top-4 text-fuchsia-200" />
            </div>
          </div>

          <div className="space-y-6">
            {entries.map((entry, eIdx) => (
              <div key={eIdx} className="p-6 bg-fuchsia-50/20 rounded-[32px] border border-fuchsia-100/30 relative animate-in fade-in slide-in-from-bottom-2">
                <button 
                  onClick={() => entries.length > 1 && setEntries(entries.filter((_, i) => i !== eIdx))}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-white text-rose-400 rounded-full flex items-center justify-center shadow-md border border-rose-50 hover:bg-rose-500 hover:text-white transition-all z-10"
                >
                  <X size={16} />
                </button>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Gelato Selecionado</label>
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
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Peso dos Baldes (gramas)</label>
                      <button onClick={() => { const n = [...entries]; n[eIdx].weights.push(0); setEntries(n); }} className="text-[9px] font-black text-fuchsia-500 uppercase flex items-center gap-1 hover:text-fuchsia-700 transition-colors">
                        <Plus size={10} /> Novo Balde
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {entry.weights.map((w, wIdx) => (
                        <div key={wIdx} className="relative group flex gap-2 items-center">
                          <div className="relative flex-1">
                            <input 
                              type="number"
                              step="any"
                              placeholder="0,00"
                              className="w-full bg-white rounded-xl p-3 pl-10 text-sm font-black text-fuchsia-600 shadow-inner outline-none border border-transparent focus:border-fuchsia-200"
                              value={w === 0 ? '' : w}
                              onChange={(e) => updateWeight(eIdx, wIdx, e.target.value)}
                            />
                            <Scale size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200" />
                          </div>
                          {entry.weights.length > 1 && (
                            <button onClick={() => { const n = [...entries]; n[eIdx].weights.splice(wIdx,1); setEntries(n); }} className="text-rose-300 p-2"><Trash2 size={16}/></button>
                          )}
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
              className="w-full py-4 bg-white border-2 border-dashed border-fuchsia-200 text-fuchsia-400 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-fuchsia-50 transition-all"
            >
              <Plus size={18} /> Adicionar outro sabor ao lote
            </button>

            <button 
              onClick={handleSave}
              disabled={isSyncing}
              className={`w-full py-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${
                isSuccess ? 'bg-green-500 text-white' : 'magenta-gradient text-white shadow-fuchsia-200'
              }`}
            >
              {isSyncing ? <RefreshCw size={22} className="animate-spin" /> : isSuccess ? <CheckCircle2 size={22} /> : <Save size={22} />}
              {isSyncing ? 'Gravando...' : isSuccess ? 'Sucesso!' : editingLogId ? 'Atualizar Lote' : 'Salvar Produção'}
            </button>
            
            {editingLogId && (
              <button onClick={resetForm} className="w-full text-center text-[10px] font-black text-gray-300 uppercase py-2">Cancelar Edição</button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white p-4 rounded-3xl border border-fuchsia-50 shadow-sm flex items-center gap-4">
            <Filter size={18} className="text-fuchsia-200" />
            <select 
              value={historyFlavorFilter} 
              onChange={e => setHistoryFlavorFilter(e.target.value)}
              className="flex-1 bg-transparent text-xs font-black uppercase tracking-widest text-gray-500 outline-none"
            >
              <option value="all">Filtro por Sabor (Todos)</option>
              {flavors.sort((a,b) => a.name.localeCompare(b.name)).map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-20 text-center text-gray-300 font-bold italic bg-white rounded-[40px] border-2 border-dashed border-gray-50">Nenhum registro encontrado.</div>
          ) : (
            filteredHistory.map(log => (
              <div key={log.id} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black text-gray-800 text-sm">{log.date.toLocaleDateString('pt-BR')}</h4>
                    <p className="text-[10px] font-mono text-fuchsia-300 uppercase tracking-widest">{log.id}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditLog(log)} className="p-3 bg-fuchsia-50 text-fuchsia-500 rounded-xl hover:bg-fuchsia-500 hover:text-white transition-all shadow-sm">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteProductionBatch(log.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 relative z-10">
                  {log.entries.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold py-1 border-b border-fuchsia-50 last:border-0">
                      <span className="text-gray-600">{flavors.find(f => f.id === e.flavorId)?.name}</span>
                      <span className="text-fuchsia-600">{(e.totalGrams/1000).toFixed(1)}kg ({e.bucketCount} vol)</span>
                    </div>
                  ))}
                </div>

                {log.batchNote && (
                  <div className="mt-4 p-3 bg-fuchsia-50/30 rounded-2xl border border-fuchsia-50 flex gap-3">
                    <FileText size={14} className="text-fuchsia-300 mt-1 shrink-0" />
                    <p className="text-[10px] text-gray-400 italic font-medium leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                      "{log.batchNote}"
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProductionForm;
