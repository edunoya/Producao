
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  Search, MapPin, ClipboardList, Store as StoreIcon,
  RefreshCw, Send, ArrowRight, Loader2, Lock, Trash2, CheckCircle2, AlertCircle, Scale, Edit2, X, ChevronRight, Tags
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  const { buckets, flavors, saveStoreClosing, markAsSold, deleteBucket, updateBucketWeight, isSyncing, isInitialLoad } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'lojas'> (standalone ? 'lojas' : 'geral');
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedStore = useMemo(() => {
    if (!params.storeName) return STORES[0] as StoreName;
    const decoded = decodeURIComponent(params.storeName).trim();
    return STORES.find(s => s === decoded) as StoreName || STORES[0] as StoreName;
  }, [params.storeName]);

  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);

  useEffect(() => {
    if (!isInitialLoad && !isSyncing) {
      const storeBuckets = buckets.filter(b => b.location === selectedStore && b.status === 'estoque');
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
    }
  }, [selectedStore, buckets, isInitialLoad, isSyncing]);

  const filteredBuckets = useMemo(() => {
    return buckets
      .filter(b => filterStore === 'Todos' ? true : b.location === filterStore)
      .filter(b => {
        if (!searchTerm) return true;
        const f = flavors.find(fl => fl.id === b.flavorId);
        const term = searchTerm.toLowerCase();
        return f?.name.toLowerCase().includes(term) || b.id.toLowerCase().includes(term) || b.status.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const nameA = flavors.find(f => f.id === a.flavorId)?.name || '';
        const nameB = flavors.find(f => f.id === b.flavorId)?.name || '';
        return nameA.localeCompare(nameB);
      });
  }, [buckets, filterStore, searchTerm, flavors]);

  const handleUpdateLocalWeight = (id: string, newGrams: number) => {
    setLocalBuckets(prev => prev.map(b => b.id === id ? { ...b, grams: Math.max(0, newGrams) } : b));
    setHasChanges(true);
  };

  const handleAcabou = async (id: string) => {
    if (window.confirm("Confirmar que o gelato acabou?")) {
      try {
        if (standalone) {
          setLocalBuckets(prev => prev.filter(b => b.id !== id));
          setHasChanges(true);
        } else {
          await markAsSold(id);
        }
      } catch (e: any) {
        setErrorMessage("Erro ao remover balde: " + e.message);
        setTimeout(() => setErrorMessage(null), 4000);
      }
    }
  }

  const handleSaveWeightEdit = async (id: string, weight: number) => {
    try {
      await updateBucketWeight(id, weight);
    } catch (e: any) {
      setErrorMessage("Erro ao atualizar peso: " + e.message);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleFinalizeExpedient = async () => {
    if (isSyncing) return;
    const totalGrams = localBuckets.reduce((acc, b) => acc + b.grams, 0);
    if (window.confirm(`Salvar fechamento com ${(totalGrams/1000).toFixed(1)}kg?`)) {
      try {
        await saveStoreClosing(selectedStore, localBuckets);
        setHasChanges(false);
        if (standalone) setShowFinishedScreen(true);
      } catch (e: any) {
        setErrorMessage("Falha ao encerrar expediente. Verifique sua internet.");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border";
    switch(status) {
      case 'estoque': return `${base} bg-green-50 text-green-500 border-green-100`;
      case 'vendido': return `${base} bg-gray-50 text-gray-400 border-gray-100`;
      case 'distribuido': return `${base} bg-blue-50 text-blue-500 border-blue-100`;
      default: return `${base} bg-gray-50 text-gray-400 border-gray-100`;
    }
  };

  if (showFinishedScreen && standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-6 animate-in zoom-in duration-500">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-fuchsia-50 text-center max-w-sm w-full space-y-10">
          <div className="w-32 h-32 magenta-gradient rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-fuchsia-100">
             <CheckCircle2 size={64} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Expediente Encerrado</h1>
            <p className="text-gray-400 font-bold mt-3 leading-relaxed">Estoque sincronizado com a fábrica com sucesso.</p>
          </div>
          <div className="pt-4 flex flex-col items-center gap-2">
            <Lock size={18} className="text-fuchsia-300" />
            <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest">Acesso Restrito - Lorenza</p>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center gap-8 animate-in fade-in">
        <Loader2 className="w-20 h-20 text-fuchsia-500 animate-spin stroke-[1]" />
        <p className="text-fuchsia-600 font-black uppercase tracking-[0.4em] text-[10px]">Sincronizando Dados...</p>
      </div>
    );
  }

  if (standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] p-4 md:p-8 animate-in fade-in duration-700 pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm sticky top-4 z-40">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 magenta-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
                <StoreIcon size={28} />
              </div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight">{selectedStore}</h1>
            </div>
            <div className={`p-4 rounded-full transition-all ${isSyncing ? 'text-amber-500' : 'text-green-500'}`}>
               <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
            </div>
          </header>

          {errorMessage && (
             <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <AlertCircle size={16} /> {errorMessage}
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localBuckets.length === 0 ? (
              <div className="md:col-span-2 py-20 text-center text-gray-300 font-bold italic bg-white rounded-[40px] border-2 border-dashed border-fuchsia-50">
                Nenhum balde ativo nesta loja.
              </div>
            ) : (
              localBuckets.map(b => (
                <div key={b.id} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm transition-all hover:border-fuchsia-200 group">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-black text-gray-800 text-lg leading-tight">{flavors.find(fl => fl.id === b.flavorId)?.name}</h4>
                    <button onClick={() => handleAcabou(b.id)} className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">Acabou</button>
                  </div>
                  <div className="flex items-center gap-4 bg-fuchsia-50/30 p-4 rounded-2xl border border-fuchsia-50 transition-colors group-hover:bg-fuchsia-50/50">
                    <Scale size={20} className="text-fuchsia-200" />
                    <div className="flex-1 flex items-end">
                      <input 
                        type="number" 
                        value={b.grams}
                        onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                        className="bg-transparent text-3xl font-black text-fuchsia-600 outline-none w-full text-center"
                        step="10"
                      />
                      <span className="text-sm font-black text-fuchsia-200 mb-1">g</span>
                    </div>
                  </div>
                  <p className="text-[8px] font-mono text-gray-300 mt-3 text-center uppercase tracking-widest">{b.id}</p>
                </div>
              ))
            )}
          </div>

          {hasChanges && localBuckets.length > 0 && (
            <div className="fixed bottom-8 left-0 right-0 px-6 z-50 animate-in slide-in-from-bottom-10">
              <button onClick={handleFinalizeExpedient} disabled={isSyncing} className="w-full max-w-md mx-auto magenta-gradient text-white py-6 rounded-[32px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50">
                {isSyncing ? <RefreshCw className="animate-spin" /> : <Send size={24} />}
                {isSyncing ? 'Sincronizando...' : 'Finalizar Expediente'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex gap-8 border-b border-fuchsia-50 mb-10 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveTab('geral')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] relative transition-colors ${activeTab === 'geral' ? 'text-fuchsia-600' : 'text-gray-400'}`}>
          Estoque Geral
          {activeTab === 'geral' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full"></div>}
        </button>
        <button onClick={() => setActiveTab('lojas')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] relative transition-colors ${activeTab === 'lojas' ? 'text-fuchsia-600' : 'text-gray-400'}`}>
          Monitorar Unidades
          {activeTab === 'lojas' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full"></div>}
        </button>
      </div>

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 animate-in fade-in">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {activeTab === 'geral' ? (
        <div className="bg-white rounded-[40px] border border-fuchsia-50 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
           <div className="p-6 border-b border-fuchsia-50 bg-fuchsia-50/10 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Pesquisar (sabor, ID ou status)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white rounded-2xl px-12 py-4 text-sm font-bold outline-none border border-fuchsia-50 focus:border-fuchsia-200 transition-all shadow-inner"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
              </div>
              <select 
                value={filterStore} 
                onChange={e => setFilterStore(e.target.value)}
                className="bg-white border border-fuchsia-50 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-fuchsia-400 outline-none shadow-sm"
              >
                <option value="Todos">Todas Unidades</option>
                {['Fábrica', ...STORES].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-fuchsia-50/20 text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">
                    <th className="px-10 py-6">Gelato / ID</th>
                    <th className="px-10 py-6 text-right">Massa (g)</th>
                    <th className="px-10 py-6">Status / Local</th>
                    <th className="px-10 py-6 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fuchsia-50/30">
                  {filteredBuckets.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-bold italic">Nenhum estoque disponível para este filtro.</td></tr>
                  ) : (
                    filteredBuckets.map(b => (
                      <tr key={b.id} className="hover:bg-fuchsia-50/10 transition-colors group">
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-2">
                             <Tags size={12} className="text-fuchsia-200" />
                             <p className="font-black text-gray-800 text-sm truncate max-w-[140px]">{flavors.find(f => f.id === b.flavorId)?.name}</p>
                           </div>
                           <span className="text-[9px] font-mono text-gray-300 ml-5">{b.id}</span>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 group/input">
                            <input 
                              type="number"
                              className="bg-transparent text-right w-24 font-black text-fuchsia-600 outline-none p-1 rounded hover:bg-fuchsia-50 focus:bg-white focus:ring-1 focus:ring-fuchsia-100 transition-all text-sm"
                              defaultValue={b.grams}
                              onBlur={(e) => {
                                const newVal = Number(e.target.value);
                                if (newVal !== b.grams) handleSaveWeightEdit(b.id, newVal);
                              }}
                            />
                            <Scale size={14} className="text-fuchsia-100 opacity-0 group-hover/input:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className={getStatusBadge(b.status)}>{b.status}</span>
                            <span className="text-[9px] font-black px-2 py-0.5 bg-fuchsia-50 rounded text-fuchsia-400 uppercase tracking-tighter">
                              {b.location}
                            </span>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                           <button onClick={() => deleteBucket(b.id)} className="text-rose-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 p-2">
                             <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
             </table>
           </div>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in">
           {['Fábrica', ...STORES].map(store => {
             const storeBuckets = buckets.filter(b => b.location === store && b.status === 'estoque');
             if (storeBuckets.length === 0) return null;
             
             return (
               <div key={store} className="space-y-6">
                 <div className="flex justify-between items-center px-4">
                   <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                     <StoreIcon size={28} className="text-fuchsia-500" /> {store}
                   </h3>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{storeBuckets.length} baldes ativos</span>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {storeBuckets.map(b => (
                      <div key={b.id} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm relative group hover:border-fuchsia-200 transition-all">
                        <div className="flex justify-between mb-6">
                          <div>
                            <h4 className="font-black text-gray-800 text-lg leading-tight truncate">{flavors.find(fl => fl.id === b.flavorId)?.name}</h4>
                            <span className="text-[9px] font-mono text-gray-300 block mt-1">{b.id}</span>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => deleteBucket(b.id)} className="p-2 text-rose-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                          </div>
                        </div>
                        
                        <div className="bg-fuchsia-50/40 p-5 rounded-2xl flex items-center justify-between border border-fuchsia-100/30">
                           <div className="flex items-center gap-3 flex-1">
                              <Scale size={18} className="text-fuchsia-200" />
                              <input 
                                type="number"
                                className="bg-transparent text-3xl font-black text-fuchsia-600 outline-none w-full"
                                defaultValue={b.grams}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (val !== b.grams) updateBucketWeight(b.id, val);
                                }}
                              />
                           </div>
                           <span className="text-sm font-black text-fuchsia-200">g</span>
                        </div>
                      </div>
                    ))}
                 </div>
               </div>
             );
           })}
        </div>
      )}
    </div>
  );
};

export default InventoryList;
