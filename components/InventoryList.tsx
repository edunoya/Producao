
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES, LOW_STOCK_THRESHOLD_GRAMS } from '../constants';
import { 
  Search, MapPin, Package, Edit2, 
  Trash2, X, ClipboardList, Store as StoreIcon,
  AlertTriangle, RefreshCw, LogOut,
  ChevronRight, Info, RotateCcw, CheckCircle, Send,
  ArrowRight, History
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  
  // Normalização do nome da loja vindo da URL
  const urlStoreName = useMemo(() => {
    if (!params.storeName) return null;
    const decoded = decodeURIComponent(params.storeName).trim().toLowerCase().replace(/-/g, ' ');
    return STORES.find(s => s.toLowerCase() === decoded) as StoreName || null;
  }, [params.storeName]);
  
  const { buckets, flavors, saveStoreClosing, isSyncing, deleteBucket, storeClosingLogs } = useInventory();
  
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

  // Carregamento Seguro do Estoque
  useEffect(() => {
    if (!isClosingExpedient && !isSyncing) {
      const storeBuckets = buckets.filter(b => b.location === selectedStore && b.status === 'estoque');
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
    }
  }, [selectedStore, buckets, isClosingExpedient, isSyncing]);

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
    setLocalBuckets(prev => prev.map(b => b.id === id ? { ...b, grams: newGrams } : b));
    setIsClosingExpedient(true);
  };

  const handleRemoveLocalBucket = (id: string) => {
    if (window.confirm("Confirmar que este balde foi finalizado?")) {
      setLocalBuckets(prev => prev.filter(b => b.id !== id));
      setIsClosingExpedient(true);
    }
  };

  const handleSendInventory = () => {
    const totalGrams = localBuckets.reduce((acc, b) => acc + b.grams, 0);
    if (window.confirm(`Sincronizar inventário da ${selectedStore} (${(totalGrams/1000).toFixed(1)}kg)?`)) {
      saveStoreClosing(selectedStore, localBuckets);
      setIsClosingExpedient(false);
      if (standalone) setShowFinishedScreen(true);
    }
  };

  if (showFinishedScreen) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-6 animate-in zoom-in duration-300">
        <div className="bg-white p-10 rounded-[50px] shadow-2xl border border-fuchsia-50 text-center max-w-sm w-full space-y-8">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
             <CheckCircle size={56} />
          </div>
          <h1 className="text-3xl font-black text-gray-800">Sincronizado!</h1>
          <p className="text-gray-400 font-bold">O estoque da {selectedStore} está atualizado na nuvem.</p>
          <button onClick={() => setShowFinishedScreen(false)} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Continuar</button>
        </div>
      </div>
    );
  }

  if (standalone && isSyncing && buckets.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center gap-6">
        <div className="w-20 h-20 border-4 border-fuchsia-100 border-t-fuchsia-500 rounded-full animate-spin"></div>
        <p className="text-fuchsia-600 font-black uppercase tracking-[0.2em] text-xs">Conectando Lorenza Cloud...</p>
      </div>
    );
  }

  // MODO STANDALONE (PDV LOJA)
  if (standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] p-4 md:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm sticky top-4 z-40">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 magenta-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
                <StoreIcon size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800">{selectedStore}</h1>
                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full" /> {isSyncing ? 'Sincronizando...' : 'Online'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isClosingExpedient && (
                <button onClick={() => setIsClosingExpedient(false)} className="p-4 text-amber-500 bg-amber-50 rounded-2xl">
                  <RotateCcw size={20} />
                </button>
              )}
              <Link to="/" className="p-4 text-gray-300 hover:text-fuchsia-500 bg-gray-50 rounded-2xl"><LogOut size={22} /></Link>
            </div>
          </header>

          <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList size={16} /> Vitrine Atual
              </h3>
              {isClosingExpedient && (
                <button 
                  onClick={handleSendInventory}
                  className="magenta-gradient text-white px-10 py-5 rounded-3xl text-sm font-black uppercase shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10"
                >
                  <Send size={18} /> Sincronizar Agora
                </button>
              )}
            </div>

            {localBuckets.length === 0 ? (
              <div className="py-40 text-center bg-white rounded-[50px] border border-dashed border-fuchsia-200">
                <Package size={48} className="text-fuchsia-100 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-gray-800">Loja sem Estoque</h2>
                <p className="text-gray-400 font-bold text-sm mt-2">Aguardando novos baldes da fábrica.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localBuckets.map(b => {
                  const f = flavors.find(fl => fl.id === b.flavorId);
                  return (
                    <div key={b.id} className="bg-white p-7 rounded-[40px] border border-fuchsia-50 shadow-sm hover:border-fuchsia-200 transition-all group">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <h4 className="font-black text-gray-800 text-xl">{f?.name}</h4>
                          <span className="text-[10px] font-mono text-fuchsia-200 block mt-1 uppercase">{b.id}</span>
                        </div>
                        <button onClick={() => handleRemoveLocalBucket(b.id)} className="bg-rose-50 text-rose-500 p-4 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                          <Trash2 size={24} />
                        </button>
                      </div>
                      <div className="bg-fuchsia-50/40 p-6 rounded-3xl flex items-center justify-between border border-fuchsia-100/50 group-hover:bg-white">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Peso (g)</span>
                          <input 
                            type="number" 
                            value={b.grams}
                            onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                            className="bg-transparent text-4xl font-black text-fuchsia-600 outline-none w-32"
                          />
                        </div>
                        <Edit2 size={24} className="text-fuchsia-200" />
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

  // MODO ADMINISTRADOR
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-fuchsia-600 p-4 rounded-2xl text-white shadow-lg flex flex-col justify-between">
           <Package size={20} className="mb-2 opacity-80" />
           <div>
             <p className="text-[10px] font-bold uppercase opacity-80">Global</p>
             <p className="text-xl font-bold">{totalGlobalKg.toFixed(1)}kg</p>
           </div>
        </div>
        {['Fábrica', ...STORES].map((loc) => {
          const kg = getWeightByLocation(loc);
          return (
            <div key={loc} className={`bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${kg < 5 ? 'border-amber-200 bg-amber-50/20' : 'border-fuchsia-50'}`}>
              <MapPin size={20} className={`mb-2 ${loc === 'Fábrica' ? 'text-amber-400' : 'text-fuchsia-400'}`} />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{loc}</p>
                <p className="text-xl font-bold text-gray-800">{kg.toFixed(1)}kg</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 border-b border-fuchsia-50">
        <button onClick={() => setActiveTab('geral')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'geral' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600' : 'text-gray-400'}`}>Estoque Geral</button>
        <button onClick={() => setActiveTab('lojas')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'lojas' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600' : 'text-gray-400'}`}>Gestão de Unidades</button>
      </div>

      {activeTab === 'geral' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200" size={18} />
              <input 
                type="text"
                placeholder="Buscar gelato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-fuchsia-50/30 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-fuchsia-100 font-bold"
              />
            </div>
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="bg-fuchsia-50/50 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-fuchsia-50">
              <option value="Todos">Todas Unidades</option>
              <option value="Fábrica">Fábrica</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-[32px] border border-fuchsia-50 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-fuchsia-50/30 border-b border-fuchsia-50">
                  <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase">Sabor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase text-right">Peso</th>
                  <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase">Local</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fuchsia-50/50">
                {filteredBuckets.map(b => (
                  <tr key={b.id} className="hover:bg-fuchsia-50/20">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-gray-700">{flavors.find(f => f.id === b.flavorId)?.name}</span>
                      <span className="text-[9px] text-gray-400 block font-mono">{b.id}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black text-fuchsia-600">{b.grams}g</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${b.location === 'Fábrica' ? 'bg-amber-50 text-amber-500' : 'bg-fuchsia-50 text-fuchsia-500'}`}>
                        {b.location}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => deleteBucket(b.id)} className="text-gray-200 hover:text-rose-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STORES.map(s => {
              const kg = getWeightByLocation(s);
              const last = storeClosingLogs.find(l => l.storeName === s);
              return (
                <div key={s} className={`bg-white p-8 rounded-[40px] border shadow-sm transition-all hover:shadow-xl ${selectedStore === s ? 'ring-2 ring-fuchsia-500 border-fuchsia-200' : 'border-fuchsia-50'}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-500">
                       <StoreIcon size={24} />
                    </div>
                    {kg < 5 && <AlertTriangle size={20} className="text-amber-500 animate-pulse" />}
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-1">{s}</h3>
                  <div className="flex items-end gap-2 mb-6">
                    <span className="text-3xl font-black text-fuchsia-600">{kg.toFixed(1)}</span>
                    <span className="text-sm font-bold text-gray-400 mb-1">kg em vitrine</span>
                  </div>
                  <div className="space-y-4 pt-6 border-t border-fuchsia-50">
                    <div className="flex items-center gap-2">
                       <History size={14} className="text-gray-300" />
                       <span className="text-[10px] font-bold text-gray-400 uppercase">
                         Sinc: {last ? last.date.toLocaleDateString() : 'Nunca'}
                       </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {setSelectedStore(s); setActiveTab('lojas');}} className="flex-1 bg-fuchsia-50 text-fuchsia-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-fuchsia-100 transition-all">Ver Estoque</button>
                      <Link to={`/loja/${encodeURIComponent(s)}`} target="_blank" className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-fuchsia-500"><ChevronRight size={18} /></Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedStore && (
            <div className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm animate-in slide-in-from-bottom-4">
               <div className="flex justify-between items-center mb-8">
                 <div>
                   <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Inventário Detalhado</h3>
                   <h2 className="text-2xl font-black text-gray-800">{selectedStore}</h2>
                 </div>
                 {isClosingExpedient && (
                    <button onClick={handleSendInventory} className="magenta-gradient text-white px-8 py-3 rounded-2xl text-xs font-black uppercase shadow-lg flex items-center gap-2">
                      <Send size={16} /> Salvar Alterações
                    </button>
                 )}
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {localBuckets.length === 0 ? (
                   <div className="col-span-full py-12 text-center text-gray-300 font-bold italic">Nenhum balde ativo nesta unidade.</div>
                 ) : (
                   localBuckets.map(b => (
                     <div key={b.id} className="p-5 rounded-3xl bg-fuchsia-50/30 border border-fuchsia-100">
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-sm font-black text-gray-700">{flavors.find(f => f.id === b.flavorId)?.name}</span>
                          <button onClick={() => handleRemoveLocalBucket(b.id)} className="text-rose-300 hover:text-rose-500"><X size={14} /></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={b.grams}
                            onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                            className="w-full bg-white px-3 py-2 rounded-xl text-lg font-black text-fuchsia-600 border-none shadow-sm"
                          />
                          <span className="text-xs font-bold text-gray-400">g</span>
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
