import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  Search, Tag, MapPin, Package, Edit2, 
  Trash2, X, ClipboardList, Store as StoreIcon,
  Save, AlertTriangle, ArrowLeft, RefreshCw, LogOut,
  ChevronRight, Info
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  // Decodifica o nome da loja da URL para garantir correspondência correta
  const urlStoreName = params.storeName ? decodeURIComponent(params.storeName) as StoreName : null;
  
  const { buckets, flavors, categories, deleteBucket, saveStoreClosing, isSyncing } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'lojas'>(standalone ? 'lojas' : 'geral');
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controle por Loja
  const [selectedStore, setSelectedStore] = useState<StoreName>(urlStoreName || 'Campo Duna');
  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [isClosingExpedient, setIsClosingExpedient] = useState(false);

  // Força a loja correta em modo standalone vindo da URL
  useEffect(() => {
    if (standalone && urlStoreName) {
      setSelectedStore(urlStoreName);
    }
  }, [standalone, urlStoreName]);

  // Carrega baldes da loja selecionada (apenas status estoque)
  useEffect(() => {
    if (!isClosingExpedient) {
      const storeBuckets = buckets.filter(b => b.location === selectedStore && b.status === 'estoque');
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets))); // Clone profundo para edição local
    }
  }, [selectedStore, buckets, isClosingExpedient]);

  const filteredBuckets = buckets.filter(b => {
    const flavor = flavors.find(f => f.id === b.flavorId);
    const matchesStore = filterStore === 'Todos' || b.location === filterStore;
    const matchesSearch = flavor?.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStore && matchesSearch && b.status === 'estoque';
  });

  const getWeightByLocation = (loc: string) => buckets.filter(b => b.location === loc && b.status === 'estoque').reduce((acc, b) => acc + b.grams, 0) / 1000;
  const totalGlobalKg = buckets.filter(b => b.status === 'estoque').reduce((acc, b) => acc + b.grams, 0) / 1000;

  const handleUpdateLocalWeight = (id: string, newGrams: number) => {
    setLocalBuckets(prev => prev.map(b => b.id === id ? { ...b, grams: newGrams } : b));
    setIsClosingExpedient(true);
  };

  const handleRemoveLocalBucket = (id: string) => {
    setLocalBuckets(prev => prev.filter(b => b.id !== id));
    setIsClosingExpedient(true);
  };

  const handleSaveClosing = () => {
    if (window.confirm(`Confirmar fechamento da loja ${selectedStore}? Os baldes removidos serão marcados como vendidos.`)) {
      saveStoreClosing(selectedStore, localBuckets);
      setIsClosingExpedient(false);
    }
  };

  // UI Standalone (Kiosk Mode)
  if (standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] p-4 md:p-8 animate-in fade-in duration-500">
        <div className="max-w-4xl mx-auto space-y-6">
          <header className="flex justify-between items-center bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 magenta-gradient rounded-2xl flex items-center justify-center text-white shadow-lg shadow-fuchsia-100">
                <StoreIcon size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-800 tracking-tight">{selectedStore}</h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                     {isSyncing ? 'Sincronizando...' : 'Estoque em Tempo Real'}
                   </span>
                </div>
              </div>
            </div>
            <Link to="/" className="p-3 text-gray-300 hover:text-fuchsia-500 bg-fuchsia-50/50 rounded-2xl transition-all">
              <LogOut size={20} />
            </Link>
          </header>

          <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-3xl flex items-start gap-3">
             <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
             <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
               MODO FECHAMENTO: Atualize o peso dos baldes abertos e remova os que acabaram. 
               Isso não altera o registro original de produção da fábrica.
             </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList size={14} /> Baldes na Vitrine
              </h3>
              {isClosingExpedient && (
                <button 
                  onClick={handleSaveClosing}
                  className="magenta-gradient text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-fuchsia-200 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all animate-in slide-in-from-right-4"
                >
                  <Save size={18} /> Salvar Fechamento
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localBuckets.length === 0 ? (
                <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-fuchsia-100 flex flex-col items-center">
                  <div className="w-20 h-20 bg-fuchsia-50 rounded-full flex items-center justify-center mb-4">
                    <Package size={32} className="text-fuchsia-200" />
                  </div>
                  <p className="text-gray-400 font-bold italic">Nenhum balde no estoque da loja.</p>
                  <p className="text-[10px] text-gray-300 mt-2 uppercase tracking-widest">Aguardando distribuição da fábrica</p>
                </div>
              ) : (
                localBuckets.map(b => {
                  const flavor = flavors.find(f => f.id === b.flavorId);
                  return (
                    <div key={b.id} className="bg-white p-5 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col justify-between group hover:border-fuchsia-200 transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                          <h4 className="font-black text-gray-800 text-lg leading-tight">{flavor?.name}</h4>
                          <span className="text-[10px] font-mono text-fuchsia-300 mt-1 block">{b.id}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveLocalBucket(b.id)}
                          className="bg-rose-50 text-rose-500 p-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          title="Remover balde vazio"
                        >
                          <X size={16} /> Acabou
                        </button>
                      </div>

                      <div className="bg-fuchsia-50/40 p-5 rounded-2xl flex items-center justify-between border border-fuchsia-100/50">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Gramas Atuais</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              value={b.grams || ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                              className="bg-transparent text-2xl font-black text-fuchsia-600 outline-none w-24 placeholder:text-fuchsia-200"
                            />
                            <span className="text-sm font-bold text-gray-400">g</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                           <Edit2 size={16} className="text-fuchsia-200" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UI Administrativa Padrão
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-fuchsia-600 p-4 rounded-2xl text-white shadow-lg shadow-fuchsia-100 flex flex-col justify-between">
           <Package size={20} className="mb-2 opacity-80" />
           <div>
             <p className="text-[10px] font-bold uppercase opacity-80">Estoque Global</p>
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
        <button 
          onClick={() => setActiveTab('geral')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'geral' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600' : 'text-gray-400'}`}
        >
          <ClipboardList size={16} /> Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('lojas')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'lojas' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600' : 'text-gray-400'}`}
        >
          <StoreIcon size={16} /> Lojas - Controle
        </button>
      </div>

      {activeTab === 'geral' ? (
        <>
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200" size={18} />
              <input 
                type="text"
                placeholder="Buscar sabor em estoque..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-fuchsia-50/30 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-fuchsia-100 outline-none font-bold text-gray-700"
              />
            </div>
            <select 
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="bg-fuchsia-50/50 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 outline-none border border-fuchsia-50"
            >
              <option value="Todos">Todas Unidades</option>
              <option value="Fábrica">Fábrica</option>
              {STORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-3xl border border-fuchsia-50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-fuchsia-50/30 border-b border-fuchsia-50">
                    <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase">Sabor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase text-right">Peso Atual</th>
                    <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase">Localização</th>
                    <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fuchsia-50/50">
                  {filteredBuckets.map(b => (
                    <tr key={b.id} className="hover:bg-fuchsia-50/20 transition-colors">
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
                         <button onClick={() => deleteBucket(b.id)} className="text-gray-200 hover:text-rose-500 transition-colors">
                           <Trash2 size={16} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex gap-2 p-1.5 bg-fuchsia-50/50 rounded-2xl border border-fuchsia-50">
              {STORES.map(s => (
                <button
                  key={s}
                  onClick={() => { setSelectedStore(s); setIsClosingExpedient(false); }}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${
                    selectedStore === s ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-100' : 'text-gray-400 hover:text-fuchsia-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                to={`/loja/${encodeURIComponent(selectedStore)}`}
                target="_blank"
                className="flex items-center gap-2 text-xs font-black text-fuchsia-400 hover:text-fuchsia-600 bg-fuchsia-50 px-4 py-2.5 rounded-xl border border-fuchsia-100 transition-all"
              >
                Link Direto para {selectedStore} <ChevronRight size={14} />
              </Link>

              {isClosingExpedient && (
                <button 
                  onClick={handleSaveClosing}
                  className="magenta-gradient text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-fuchsia-100"
                >
                  Salvar Fechamento
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {localBuckets.length === 0 ? (
               <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-fuchsia-100 text-gray-300 italic text-sm">
                  Nenhum balde em {selectedStore}.
               </div>
            ) : (
              localBuckets.map(b => (
                <div key={b.id} className="bg-white p-5 rounded-3xl border border-fuchsia-50 shadow-sm hover:border-fuchsia-200 transition-all">
                   <div className="flex justify-between items-start mb-4">
                     <div className="flex-1">
                       <span className="text-sm font-black text-gray-800 leading-tight block">{flavors.find(f => f.id === b.flavorId)?.name}</span>
                       <span className="text-[9px] font-mono text-fuchsia-200">{b.id}</span>
                     </div>
                     <button onClick={() => handleRemoveLocalBucket(b.id)} className="text-rose-300 hover:text-rose-600 p-1">
                       <X size={18} />
                     </button>
                   </div>
                   <div className="bg-fuchsia-50/50 p-4 rounded-2xl flex justify-between items-center border border-fuchsia-50">
                     <div className="flex flex-col">
                       <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Peso</span>
                       <input 
                        type="number" 
                        value={b.grams}
                        onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                        className="bg-transparent text-xl font-black text-fuchsia-600 outline-none w-20"
                       />
                     </div>
                     <span className="text-xs font-bold text-gray-400">g</span>
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