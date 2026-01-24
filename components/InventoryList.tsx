
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  Search, MapPin, Package, Edit2, 
  Trash2, X, ClipboardList, Store as StoreIcon,
  AlertTriangle, RefreshCw, LogOut,
  ChevronRight, Info, RotateCcw, CheckCircle, Send,
  ArrowRight, History, Loader2
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  
  const urlStoreName = useMemo(() => {
    if (!params.storeName) return null;
    const decoded = decodeURIComponent(params.storeName).trim().toLowerCase().replace(/-/g, ' ');
    return STORES.find(s => s.toLowerCase() === decoded) as StoreName || null;
  }, [params.storeName]);
  
  const { buckets, flavors, saveStoreClosing, isSyncing, isInitialLoad, deleteBucket, storeClosingLogs } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'lojas'> (standalone ? 'lojas' : 'geral');
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedStore, setSelectedStore] = useState<StoreName>(urlStoreName || 'Campo Duna');
  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [isClosingExpedient, setIsClosingExpedient] = useState(false);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);

  useEffect(() => {
    if (standalone && urlStoreName) setSelectedStore(urlStoreName);
  }, [standalone, urlStoreName]);

  // HYDRATION GUARD: Aguarda dados da nuvem antes de preencher o estado local
  useEffect(() => {
    if (!isInitialLoad && !isClosingExpedient) {
      const storeBuckets = buckets.filter(b => b.location === selectedStore && b.status === 'estoque');
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
    }
  }, [selectedStore, buckets, isClosingExpedient, isInitialLoad]);

  const filteredBuckets = useMemo(() => {
    return buckets
      .filter(b => b.status === 'estoque')
      .filter(b => filterStore === 'Todos' ? true : b.location === filterStore)
      .filter(b => {
        if (!searchTerm) return true;
        const f = flavors.find(fl => fl.id === b.flavorId);
        return f?.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [buckets, filterStore, searchTerm, flavors]);

  const lastClosing = useMemo(() => {
    return storeClosingLogs.find(l => l.storeName === selectedStore);
  }, [storeClosingLogs, selectedStore]);

  const totalGlobalKg = buckets.filter(b => b.status === 'estoque').reduce((acc, b) => acc + b.grams, 0) / 1000;
  const getWeightByLocation = (loc: string) => buckets.filter(b => b.location === loc && b.status === 'estoque').reduce((acc, b) => acc + b.grams, 0) / 1000;

  const handleUpdateLocalWeight = (id: string, newGrams: number) => {
    setLocalBuckets(prev => prev.map(b => b.id === id ? { ...b, grams: Math.max(0, newGrams) } : b));
    setIsClosingExpedient(true);
  };

  const handleRemoveLocalBucket = (id: string) => {
    if (window.confirm("Confirmar que este balde foi zerado/vendido?")) {
      setLocalBuckets(prev => prev.filter(b => b.id !== id));
      setIsClosingExpedient(true);
    }
  };

  const handleSendInventory = async () => {
    if (isSyncing) return;
    const totalGrams = localBuckets.reduce((acc, b) => acc + b.grams, 0);
    if (window.confirm(`Confirmar fechamento da ${selectedStore} com ${(totalGrams/1000).toFixed(1)}kg em estoque?`)) {
      await saveStoreClosing(selectedStore, localBuckets);
      setIsClosingExpedient(false);
      if (standalone) setShowFinishedScreen(true);
    }
  };

  if (showFinishedScreen) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-6 animate-in zoom-in duration-500">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-fuchsia-50 text-center max-w-sm w-full space-y-10">
          <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 shadow-inner">
             <CheckCircle size={72} className="animate-in zoom-in-50 delay-150" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-800 tracking-tight">Sucesso!</h1>
            <p className="text-gray-400 font-bold mt-3 leading-relaxed">Estoque sincronizado com a fábrica na nuvem.</p>
          </div>
          <button 
            onClick={() => setShowFinishedScreen(false)} 
            className="w-full py-6 bg-gray-900 text-white rounded-[28px] font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center gap-8 animate-in fade-in">
        <div className="relative">
          <Loader2 className="w-20 h-20 text-fuchsia-500 animate-spin stroke-[1]" />
          <StoreIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-fuchsia-300" size={32} />
        </div>
        <div className="text-center space-y-2">
          <p className="text-fuchsia-600 font-black uppercase tracking-[0.4em] text-[10px]">Lorenza Cloud</p>
          <p className="text-gray-400 text-xs font-bold italic">Sincronizando dados vitais...</p>
        </div>
      </div>
    );
  }

  if (standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] p-6 md:p-12 animate-in fade-in duration-700">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="flex justify-between items-center bg-white p-6 md:p-8 rounded-[40px] border border-fuchsia-50 shadow-sm sticky top-6 z-40">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 magenta-gradient rounded-3xl flex items-center justify-center text-white shadow-xl">
                <StoreIcon size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">{selectedStore}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                   <div className={`w-3 h-3 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     {isSyncing ? 'Cloud Sync...' : 'Conectado'}
                   </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isClosingExpedient && (
                <button 
                  onClick={() => setIsClosingExpedient(false)} 
                  className="p-5 text-amber-500 bg-amber-50 rounded-3xl hover:bg-amber-100 transition-all shadow-sm"
                  title="Descartar mudanças locais"
                >
                  <RotateCcw size={24} />
                </button>
              )}
              <Link to="/" className="p-5 text-gray-300 hover:text-fuchsia-500 bg-gray-50 rounded-3xl transition-all"><LogOut size={24} /></Link>
            </div>
          </header>

          <div className="space-y-8 pb-32">
            <div className="flex justify-between items-center px-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <ClipboardList size={18} /> Conferência de Vitrine
              </h3>
              {isClosingExpedient && (
                <button 
                  onClick={handleSendInventory}
                  disabled={isSyncing}
                  className="magenta-gradient text-white px-12 py-6 rounded-[32px] text-sm font-black uppercase tracking-widest shadow-2xl shadow-fuchsia-200 flex items-center gap-4 animate-in slide-in-from-right-10 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send size={20} /> Finalizar Expediente
                </button>
              )}
            </div>

            {localBuckets.length === 0 ? (
              <div className="py-56 text-center bg-white rounded-[60px] border border-dashed border-fuchsia-200 flex flex-col items-center justify-center space-y-8">
                <div className="w-24 h-24 bg-fuchsia-50 rounded-full flex items-center justify-center">
                   <Package size={48} className="text-fuchsia-100" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-gray-800">Sem Gelato Ativo</h2>
                  <p className="text-gray-400 font-bold text-sm tracking-wide">Aguardando novos lotes da fábrica.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {localBuckets.map(b => {
                  const f = flavors.find(fl => fl.id === b.flavorId);
                  return (
                    <div key={b.id} className="bg-white p-8 rounded-[48px] border border-fuchsia-50 shadow-sm hover:border-fuchsia-200 transition-all group relative animate-in fade-in zoom-in-95">
                      <div className="flex justify-between items-start mb-10">
                        <div className="space-y-1">
                          <h4 className="font-black text-gray-800 text-2xl leading-none">{f?.name}</h4>
                          <span className="text-[10px] font-mono text-fuchsia-200 block uppercase tracking-tighter">{b.id}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveLocalBucket(b.id)} 
                          className="bg-rose-50 text-rose-500 p-4 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                        >
                          <Trash2 size={24} />
                        </button>
                      </div>
                      <div className="bg-fuchsia-50/40 p-8 rounded-[32px] flex items-center justify-between border border-fuchsia-100/30 group-hover:bg-white group-hover:border-fuchsia-200 transition-all">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Peso Atual</span>
                          <div className="flex items-end gap-1">
                            <input 
                              type="number" 
                              value={b.grams}
                              onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                              className="bg-transparent text-5xl font-black text-fuchsia-600 outline-none w-40"
                            />
                            <span className="text-xl font-black text-fuchsia-200 mb-1">g</span>
                          </div>
                        </div>
                        <div className="p-4 bg-white rounded-2xl shadow-sm text-fuchsia-200">
                           <Edit2 size={28} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MODO ADMIN RESTANTE DA INTERFACE... (Mantendo funcionalidade mas atualizando visual)
  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-fuchsia-600 p-8 rounded-[36px] text-white shadow-2xl shadow-fuchsia-200 flex flex-col justify-between h-44">
           <Package size={28} className="mb-2 opacity-60" />
           <div>
             <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Global</p>
             <p className="text-4xl font-black">{totalGlobalKg.toFixed(1)}kg</p>
           </div>
        </div>
        {['Fábrica', ...STORES].map((loc) => {
          const kg = getWeightByLocation(loc);
          return (
            <div key={loc} className={`bg-white p-8 rounded-[36px] border shadow-sm flex flex-col justify-between h-44 transition-all ${kg < 10 ? 'border-amber-200 bg-amber-50/30' : 'border-fuchsia-50 hover:shadow-xl'}`}>
              <MapPin size={28} className={`mb-2 ${loc === 'Fábrica' ? 'text-amber-400' : 'text-fuchsia-400'}`} />
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{loc}</p>
                <p className="text-3xl font-black text-gray-800">{kg.toFixed(1)}kg</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-8 border-b border-fuchsia-50">
        <button onClick={() => setActiveTab('geral')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'geral' ? 'text-fuchsia-600' : 'text-gray-400'}`}>
          Estoque Geral
          {activeTab === 'geral' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full animate-in slide-in-from-bottom-2"></div>}
        </button>
        <button onClick={() => setActiveTab('lojas')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'lojas' ? 'text-fuchsia-600' : 'text-gray-400'}`}>
          Gestão de Unidades
          {activeTab === 'lojas' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full animate-in slide-in-from-bottom-2"></div>}
        </button>
      </div>

      {activeTab === 'geral' ? (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm flex flex-col md:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-fuchsia-200 group-focus-within:text-fuchsia-400" size={20} />
              <input 
                type="text"
                placeholder="Pesquisar estoque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-fuchsia-50/30 border-none rounded-2xl pl-14 pr-6 py-5 text-sm font-bold text-gray-700 outline-none"
              />
            </div>
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="bg-fuchsia-50/50 px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none border-none text-fuchsia-600 cursor-pointer hover:bg-fuchsia-100 transition-all">
              <option value="Todos">Todas Unidades</option>
              <option value="Fábrica">Fábrica</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-[40px] border border-fuchsia-50 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-fuchsia-50/20 text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">
                  <th className="px-10 py-6">Gelato</th>
                  <th className="px-10 py-6 text-right">Massa Atual</th>
                  <th className="px-10 py-6">Localização</th>
                  <th className="px-10 py-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fuchsia-50/30">
                {filteredBuckets.map(b => (
                  <tr key={b.id} className="hover:bg-fuchsia-50/10 transition-colors">
                    <td className="px-10 py-6">
                      <span className="text-base font-black text-gray-800">{flavors.find(f => f.id === b.flavorId)?.name}</span>
                      <span className="text-[9px] text-gray-400 block font-mono uppercase tracking-tighter mt-1">{b.id}</span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <span className="text-base font-black text-fuchsia-600">{b.grams}g</span>
                    </td>
                    <td className="px-10 py-6">
                      <span className={`text-[10px] font-black px-4 py-2 rounded-xl border ${b.location === 'Fábrica' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-fuchsia-50 text-fuchsia-500 border-fuchsia-100'}`}>
                        {b.location}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button onClick={() => deleteBucket(b.id)} className="p-3 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STORES.map(s => {
              const kg = getWeightByLocation(s);
              const last = storeClosingLogs.find(l => l.storeName === s);
              return (
                <div key={s} className={`bg-white p-10 rounded-[50px] border shadow-sm transition-all hover:shadow-2xl flex flex-col h-full ${selectedStore === s ? 'ring-4 ring-fuchsia-500/20 border-fuchsia-200' : 'border-fuchsia-50'}`}>
                  <div className="flex justify-between items-start mb-8">
                    <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center shadow-lg ${selectedStore === s ? 'magenta-gradient text-white' : 'bg-fuchsia-50 text-fuchsia-500'}`}>
                       <StoreIcon size={32} />
                    </div>
                    {kg < 10 && <AlertTriangle size={24} className="text-amber-500 animate-pulse" />}
                  </div>
                  <h3 className="text-2xl font-black text-gray-800 tracking-tight mb-2">{s}</h3>
                  <div className="flex items-end gap-2 mb-8">
                    <span className="text-4xl font-black text-fuchsia-600 tracking-tighter">{kg.toFixed(1)}</span>
                    <span className="text-sm font-bold text-gray-400 mb-1.5">kg ativos</span>
                  </div>
                  <div className="space-y-6 pt-8 border-t border-fuchsia-50 mt-auto">
                    <div className="flex items-center gap-3">
                       <History size={16} className="text-gray-300" />
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         Sinc: {last ? last.date.toLocaleDateString() : 'Sem registros'}
                       </span>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {setSelectedStore(s); setIsClosingExpedient(false);}} 
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedStore === s ? 'bg-fuchsia-600 text-white shadow-xl shadow-fuchsia-100' : 'bg-fuchsia-50 text-fuchsia-600 hover:bg-fuchsia-100'}`}
                      >
                        Auditoria
                      </button>
                      <Link to={`/loja/${encodeURIComponent(s)}`} target="_blank" className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:text-fuchsia-500 hover:shadow-md transition-all">
                        <ChevronRight size={24} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedStore && (
            <div className="bg-white p-10 rounded-[50px] border border-fuchsia-50 shadow-sm animate-in slide-in-from-bottom-8 duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                 <div>
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Conferência Detalhada</h3>
                   <h2 className="text-3xl font-black text-gray-800 tracking-tight">{selectedStore}</h2>
                 </div>
                 {isClosingExpedient && (
                    <button onClick={handleSendInventory} className="magenta-gradient text-white px-10 py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl flex items-center gap-3">
                      <Send size={20} /> Salvar Inventário
                    </button>
                 )}
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {localBuckets.length === 0 ? (
                   <div className="col-span-full py-20 text-center text-gray-300 font-bold italic border-2 border-dashed border-gray-100 rounded-[32px]">Esta unidade não possui baldes ativos.</div>
                 ) : (
                   localBuckets.map(b => (
                     <div key={b.id} className="p-6 rounded-[32px] bg-fuchsia-50/30 border border-fuchsia-100/50 hover:bg-white transition-all shadow-sm hover:shadow-md">
                        <div className="flex justify-between items-start mb-6">
                          <span className="text-base font-black text-gray-700 leading-tight">{flavors.find(f => f.id === b.flavorId)?.name}</span>
                          <button onClick={() => handleRemoveLocalBucket(b.id)} className="text-rose-200 hover:text-rose-500"><X size={18} /></button>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number" 
                            value={b.grams}
                            onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                            className="w-full bg-white px-4 py-3 rounded-2xl text-2xl font-black text-fuchsia-600 border-none shadow-inner"
                          />
                          <span className="text-xs font-black text-fuchsia-200 uppercase">g</span>
                        </div>
                     </div>
                   ))
                 )}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryList;
