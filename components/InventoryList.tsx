
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  Search, MapPin, Package, Edit2, 
  Trash2, X, ClipboardList, Store as StoreIcon,
  AlertTriangle, RefreshCw, LogOut,
  ChevronRight, Info, RotateCcw, CheckCircle, Send,
  ArrowRight, History, Loader2, Lock
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  const { buckets, flavors, saveStoreClosing, isSyncing, isInitialLoad, deleteBucket, storeClosingLogs } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'lojas'> (standalone ? 'lojas' : 'geral');
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedStore = useMemo(() => {
    if (!params.storeName) return 'Campo Duna' as StoreName;
    const decoded = decodeURIComponent(params.storeName).trim().toLowerCase().replace(/-/g, ' ');
    return STORES.find(s => s.toLowerCase() === decoded) as StoreName || 'Campo Duna' as StoreName;
  }, [params.storeName]);

  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [isClosingExpedient, setIsClosingExpedient] = useState(false);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);

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

  const handleUpdateLocalWeight = (id: string, newGrams: number) => {
    setLocalBuckets(prev => prev.map(b => b.id === id ? { ...b, grams: Math.max(0, newGrams) } : b));
    setIsClosingExpedient(true);
  };

  const handleRemoveLocalBucket = (id: string) => {
    if (window.confirm("Zerar este balde?")) {
      setLocalBuckets(prev => prev.filter(b => b.id !== id));
      setIsClosingExpedient(true);
    }
  };

  const handleSendInventory = async () => {
    if (isSyncing) return;
    const totalGrams = localBuckets.reduce((acc, b) => acc + b.grams, 0);
    if (window.confirm(`Finalizar com ${(totalGrams/1000).toFixed(1)}kg?`)) {
      await saveStoreClosing(selectedStore, localBuckets);
      setIsClosingExpedient(false);
      if (standalone) setShowFinishedScreen(true);
    }
  };

  if (showFinishedScreen && standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-6 animate-in zoom-in duration-500">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-fuchsia-50 text-center max-w-sm w-full space-y-10">
          <div className="w-32 h-32 bg-fuchsia-500 rounded-full flex items-center justify-center mx-auto text-white shadow-xl shadow-fuchsia-100">
             <Lock size={64} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Expediente Encerrado</h1>
            <p className="text-gray-400 font-bold mt-3 leading-relaxed">Os dados da vitrine foram enviados com segurança para a fábrica.</p>
          </div>
          <div className="pt-4">
            <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest">Acesso Bloqueado até amanhã</p>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center gap-8 animate-in fade-in">
        <Loader2 className="w-20 h-20 text-fuchsia-500 animate-spin stroke-[1]" />
        <p className="text-fuchsia-600 font-black uppercase tracking-[0.4em] text-[10px]">Lorenza Cloud</p>
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
                <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">Conferência Diária</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <div className={`p-4 rounded-full ${isSyncing ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
                 {isSyncing ? <RefreshCw size={24} className="animate-spin" /> : <RefreshCw size={24} />}
               </div>
            </div>
          </header>

          <div className="space-y-8 pb-32">
             <div className="flex justify-between items-center px-6">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                 <ClipboardList size={18} /> Baldes em Vitrine
               </h3>
               {isClosingExpedient && (
                 <button onClick={handleSendInventory} className="magenta-gradient text-white px-12 py-6 rounded-[32px] text-sm font-black uppercase tracking-widest shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10">
                   <Send size={20} /> Finalizar Expediente
                 </button>
               )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {localBuckets.map(b => (
                  <div key={b.id} className="bg-white p-8 rounded-[48px] border border-fuchsia-50 shadow-sm hover:border-fuchsia-200 transition-all group">
                    <div className="flex justify-between items-start mb-10">
                      <div>
                        <h4 className="font-black text-gray-800 text-2xl leading-none">{flavors.find(fl => fl.id === b.flavorId)?.name}</h4>
                        <span className="text-[10px] font-mono text-fuchsia-200 block mt-1">{b.id}</span>
                      </div>
                      <button onClick={() => handleRemoveLocalBucket(b.id)} className="bg-rose-50 text-rose-500 p-4 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                        <Trash2 size={24} />
                      </button>
                    </div>
                    <div className="bg-fuchsia-50/40 p-8 rounded-[32px] flex items-center justify-between border border-fuchsia-100/30">
                       <input 
                         type="number" 
                         value={b.grams}
                         onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                         className="bg-transparent text-5xl font-black text-fuchsia-600 outline-none w-full"
                       />
                       <span className="text-xl font-black text-fuchsia-200">g</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex gap-8 border-b border-fuchsia-50 mb-10">
        <button onClick={() => setActiveTab('geral')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] relative ${activeTab === 'geral' ? 'text-fuchsia-600' : 'text-gray-400'}`}>
          Estoque Geral
          {activeTab === 'geral' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full"></div>}
        </button>
        <button onClick={() => setActiveTab('lojas')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] relative ${activeTab === 'lojas' ? 'text-fuchsia-600' : 'text-gray-400'}`}>
          Monitorar Unidades
          {activeTab === 'lojas' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full"></div>}
        </button>
      </div>

      {activeTab === 'geral' ? (
        <div className="bg-white rounded-[40px] border border-fuchsia-50 shadow-sm overflow-hidden">
           <div className="p-8 border-b border-fuchsia-50">
              <input 
                type="text" 
                placeholder="Pesquisar estoque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-fuchsia-50/30 rounded-2xl px-6 py-4 text-sm font-bold outline-none border-none"
              />
           </div>
           <table className="w-full text-left">
              <thead>
                <tr className="bg-fuchsia-50/20 text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">
                  <th className="px-10 py-6">Sabor</th>
                  <th className="px-10 py-6 text-right">Peso</th>
                  <th className="px-10 py-6">Local</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fuchsia-50/30">
                {filteredBuckets.map(b => (
                  <tr key={b.id}>
                    <td className="px-10 py-6 font-black text-gray-800">{flavors.find(f => f.id === b.flavorId)?.name}</td>
                    <td className="px-10 py-6 text-right font-black text-fuchsia-600">{b.grams}g</td>
                    <td className="px-10 py-6">
                      <span className="text-[10px] font-black px-3 py-1 bg-fuchsia-50 rounded-lg text-fuchsia-500 border border-fuchsia-100">{b.location}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {STORES.map(s => (
             <Link key={s} to={`/loja/${encodeURIComponent(s)}`} className="bg-white p-10 rounded-[50px] border border-fuchsia-50 shadow-sm hover:shadow-xl transition-all flex flex-col items-center gap-6">
                <div className="w-20 h-20 magenta-gradient rounded-3xl flex items-center justify-center text-white shadow-xl">
                  <StoreIcon size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{s}</h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-fuchsia-400 uppercase tracking-widest bg-fuchsia-50 px-4 py-2 rounded-xl">
                  Clique para Auditar <ArrowRight size={14} />
                </div>
             </Link>
           ))}
        </div>
      )}
    </div>
  );
};

export default InventoryList;
