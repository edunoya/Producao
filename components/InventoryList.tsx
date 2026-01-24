
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  Search, Tag, MapPin, Package, Edit2, 
  Trash2, X, ClipboardList, Store as StoreIcon,
  Save, AlertTriangle, ArrowLeft, RefreshCw, LogOut,
  ChevronRight, Info, RotateCcw, CheckCircle, Send,
  Loader2
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  const navigate = useNavigate();
  
  // Normalização do nome da loja vindo da URL
  const urlStoreName = useMemo(() => {
    if (!params.storeName) return null;
    const decoded = decodeURIComponent(params.storeName).trim();
    // Procura na lista oficial ignorando case
    return STORES.find(s => s.toLowerCase() === decoded.toLowerCase()) as StoreName || null;
  }, [params.storeName]);
  
  const { buckets, flavors, saveStoreClosing, isSyncing } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'lojas'>(standalone ? 'lojas' : 'geral');
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedStore, setSelectedStore] = useState<StoreName>(urlStoreName || 'Campo Duna');
  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [isClosingExpedient, setIsClosingExpedient] = useState(false);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);

  // Sincroniza o estado da loja se a URL mudar
  useEffect(() => {
    if (standalone && urlStoreName) {
      setSelectedStore(urlStoreName);
    }
  }, [standalone, urlStoreName]);

  // Carregamento do estoque: Só atualiza se NÃO houver edição em curso e se não estiver sincronizando
  useEffect(() => {
    if (!isClosingExpedient && !isSyncing) {
      const storeBuckets = buckets.filter(b => 
        b.location.toLowerCase() === selectedStore.toLowerCase() && 
        b.status === 'estoque'
      );
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
    }
  }, [selectedStore, buckets, isClosingExpedient, isSyncing]);

  const filteredBuckets = useMemo(() => {
    return buckets
      .filter(b => b.status === 'estoque')
      .filter(b => {
        if (filterStore === 'Todos') return true;
        return b.location === filterStore;
      })
      .filter(b => {
        if (!searchTerm) return true;
        const flavorName = flavors.find(f => f.id === b.flavorId)?.name || '';
        return flavorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
               b.id.toLowerCase().includes(searchTerm.toLowerCase());
      });
  }, [buckets, filterStore, searchTerm, flavors]);

  const totalGlobalKg = buckets.filter(b => b.status === 'estoque').reduce((acc, b) => acc + b.grams, 0) / 1000;
  const getWeightByLocation = (loc: string) => buckets.filter(b => b.location === loc && b.status === 'estoque').reduce((acc, b) => acc + b.grams, 0) / 1000;

  const handleUpdateLocalWeight = (id: string, newGrams: number) => {
    setLocalBuckets(prev => prev.map(b => b.id === id ? { ...b, grams: newGrams } : b));
    setIsClosingExpedient(true);
  };

  const handleRemoveLocalBucket = (id: string) => {
    setLocalBuckets(prev => prev.filter(b => b.id !== id));
    setIsClosingExpedient(true);
  };

  const handleRevert = () => {
    if (window.confirm("Descartar alterações e recarregar dados do sistema?")) {
      setIsClosingExpedient(false);
    }
  };

  const handleSendInventory = () => {
    const totalGrams = localBuckets.reduce((acc, b) => acc + b.grams, 0);
    if (window.confirm(`Atualizar estoque da ${selectedStore} (${(totalGrams/1000).toFixed(1)}kg)?`)) {
      saveStoreClosing(selectedStore, localBuckets);
      setIsClosingExpedient(false);
      if (standalone) {
        setShowFinishedScreen(true);
      }
    }
  };

  if (showFinishedScreen) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-6">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-fuchsia-50 text-center max-w-sm w-full space-y-8 animate-in zoom-in">
          <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
             <CheckCircle size={64} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800">Estoque Atualizado!</h1>
            <p className="text-gray-400 font-bold mt-2">Dados sincronizados com a fábrica.</p>
          </div>
          <button onClick={() => setShowFinishedScreen(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase">Continuar</button>
        </div>
      </div>
    );
  }

  // Carregamento inicial (Standalone)
  if (standalone && isSyncing && buckets.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-fuchsia-500 animate-spin" />
        <p className="text-fuchsia-400 font-black uppercase tracking-widest text-[10px]">Conectando com a Nuvem...</p>
      </div>
    );
  }

  if (standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] p-4 md:p-10 animate-in fade-in duration-700">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm sticky top-4 z-40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 magenta-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
                <StoreIcon size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800">{selectedStore}</h1>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
                   <span className="text-[10px] font-black text-gray-400 uppercase">{isSyncing ? 'Sincronizando' : 'Online'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isClosingExpedient && (
                <button onClick={handleRevert} className="p-3 text-amber-500 bg-amber-50 rounded-xl hover:bg-amber-100 transition-all">
                  <RotateCcw size={20} />
                </button>
              )}
              <Link to="/" className="p-3 text-gray-300 hover:text-fuchsia-500 bg-gray-50 rounded-xl transition-all">
                <LogOut size={20} />
              </Link>
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
                  className="magenta-gradient text-white px-8 py-4 rounded-2xl text-sm font-black uppercase shadow-xl flex items-center gap-2"
                >
                  <Send size={18} /> Enviar Dados
                </button>
              )}
            </div>

            {localBuckets.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-[40px] border border-dashed border-fuchsia-200 flex flex-col items-center">
                <Package size={48} className="text-fuchsia-100 mb-4" />
                <h2 className="text-xl font-black text-gray-800">Sem gelatos na vitrine</h2>
                <p className="text-gray-400 font-bold text-sm mt-1">Aguardando distribuição da fábrica.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {localBuckets.map(b => {
                  const flavor = flavors.find(f => f.id === b.flavorId);
                  return (
                    <div key={b.id} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm hover:border-fuchsia-200 transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <h4 className="font-black text-gray-800 text-xl">{flavor?.name}</h4>
                          <span className="text-[9px] font-mono text-fuchsia-200 block mt-1">{b.id}</span>
                        </div>
                        <button onClick={() => handleRemoveLocalBucket(b.id)} className="bg-rose-50 text-rose-500 p-3 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                          <Trash2 size={20} />
                        </button>
                      </div>

                      <div className="bg-fuchsia-50/40 p-5 rounded-2xl flex items-center justify-between border border-fuchsia-100/50">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase mb-1">Peso (g)</span>
                          <input 
                            type="number" 
                            value={b.grams}
                            onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                            className="bg-transparent text-3xl font-black text-fuchsia-600 outline-none w-28"
                          />
                        </div>
                        <Edit2 size={20} className="text-fuchsia-200" />
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
        {['Fábrica', ...STORES].map((loc) => (
          <div key={loc} className="bg-white p-4 rounded-2xl border border-fuchsia-50 shadow-sm flex flex-col justify-between">
            <MapPin size={20} className={`mb-2 ${loc === 'Fábrica' ? 'text-amber-400' : 'text-fuchsia-400'}`} />
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{loc}</p>
              <p className="text-xl font-bold text-gray-800">{getWeightByLocation(loc).toFixed(1)}kg</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 border-b border-fuchsia-50">
        <button onClick={() => setActiveTab('geral')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'geral' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600' : 'text-gray-400'}`}>Visão Geral</button>
        <button onClick={() => setActiveTab('lojas')} className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'lojas' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600' : 'text-gray-400'}`}>Lojas (PDV)</button>
      </div>

      {activeTab === 'geral' ? (
        <>
          <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200" size={18} />
              <input 
                type="text"
                placeholder="Buscar gelato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-fuchsia-50/30 border-none rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-fuchsia-100 outline-none font-bold"
              />
            </div>
            <select value={filterStore} onChange={(e) => setFilterStore(e.target.value)} className="bg-fuchsia-50/50 px-4 py-3 rounded-xl text-xs font-bold outline-none border border-fuchsia-50">
              <option value="Todos">Todas Unidades</option>
              <option value="Fábrica">Fábrica</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-fuchsia-50 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-fuchsia-50/30 border-b border-fuchsia-50">
                  <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase">Sabor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase text-right">Peso</th>
                  <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase">Local</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-2 p-1.5 bg-fuchsia-50/50 rounded-2xl">
              {STORES.map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedStore(s)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${selectedStore === s ? 'bg-fuchsia-500 text-white' : 'text-gray-400'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            
            <Link to={`/loja/${encodeURIComponent(selectedStore)}`} target="_blank" className="text-xs font-black text-fuchsia-400 hover:text-fuchsia-600 bg-fuchsia-50 px-6 py-3 rounded-xl border border-fuchsia-100 flex items-center gap-2 transition-all">
              Abrir Link Direto <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {localBuckets.length === 0 ? (
               <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-fuchsia-100 text-gray-300 font-bold italic text-sm">Sem estoque ativo na {selectedStore}.</div>
            ) : (
              localBuckets.map(b => (
                <div key={b.id} className="bg-white p-5 rounded-3xl border border-fuchsia-50 shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <span className="text-sm font-black text-gray-800 block">{flavors.find(f => f.id === b.flavorId)?.name}</span>
                       <span className="text-[9px] font-mono text-fuchsia-200">{b.id}</span>
                     </div>
                   </div>
                   <div className="bg-fuchsia-50/50 p-4 rounded-2xl flex justify-between items-center">
                     <span className="text-xl font-black text-fuchsia-600">{b.grams}g</span>
                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Peso Atual</div>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
