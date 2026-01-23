
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
  
  // 1. Detecção Robusta da Loja via URL
  const urlStoreName = useMemo(() => {
    if (!params.storeName) return null;
    const decoded = decodeURIComponent(params.storeName).trim().toLowerCase();
    // Procura na lista oficial de lojas ignorando case
    return STORES.find(s => s.toLowerCase() === decoded) as StoreName || null;
  }, [params.storeName]);
  
  const { buckets, flavors, categories, deleteBucket, saveStoreClosing, isSyncing } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'lojas'>(standalone ? 'lojas' : 'geral');
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Inicializa com a loja da URL ou a primeira disponível
  const [selectedStore, setSelectedStore] = useState<StoreName>(urlStoreName || 'Campo Duna');
  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [isClosingExpedient, setIsClosingExpedient] = useState(false);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  // 2. Sincroniza o estado da loja se a URL mudar (navegação direta)
  useEffect(() => {
    if (standalone && urlStoreName) {
      setSelectedStore(urlStoreName);
    }
  }, [standalone, urlStoreName]);

  // 3. CARREGAMENTO REATIVO DO ESTOQUE
  // Este efeito é a chave: ele observa 'buckets' e 'selectedStore'.
  // Se buckets mudar (dados chegaram do Firebase), ele popula localBuckets imediatamente.
  useEffect(() => {
    if (!isClosingExpedient) {
      const storeBuckets = buckets.filter(b => 
        b.location.toLowerCase() === selectedStore.toLowerCase() && 
        b.status === 'estoque'
      );
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
      
      // Marca que já tentamos carregar pelo menos uma vez com dados presentes
      if (buckets.length > 0) {
        setHasInitialLoaded(true);
      }
    }
  }, [selectedStore, buckets, isClosingExpedient]);

  // Fix: Added filteredBuckets memo to resolve "Cannot find name 'filteredBuckets'" error
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
    if (window.confirm("Descartar alterações locais e recarregar pesos do servidor?")) {
      setIsClosingExpedient(false);
      const storeBuckets = buckets.filter(b => b.location === selectedStore && b.status === 'estoque');
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
    }
  };

  const handleSendInventory = () => {
    const totalGrams = localBuckets.reduce((acc, b) => acc + b.grams, 0);
    if (window.confirm(`Enviar atualizações de estoque da ${selectedStore} (${(totalGrams/1000).toFixed(1)}kg)?`)) {
      saveStoreClosing(selectedStore, localBuckets);
      setIsClosingExpedient(false);
      if (standalone) {
        setShowFinishedScreen(true);
      }
    }
  };

  // UI: Tela de Finalização
  if (showFinishedScreen) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-6 animate-in zoom-in duration-300">
        <div className="bg-white p-12 rounded-[40px] shadow-2xl border border-fuchsia-50 text-center max-w-sm w-full space-y-8">
          <div className="w-28 h-28 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 animate-bounce">
             <CheckCircle size={64} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Sucesso!</h1>
            <p className="text-gray-400 font-bold mt-3 leading-relaxed">
              O estoque da <span className="text-fuchsia-500">{selectedStore}</span> foi sincronizado.
            </p>
          </div>
          <button 
            onClick={() => setShowFinishedScreen(false)}
            className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
          >
            Continuar Editando
          </button>
        </div>
      </div>
    );
  }

  // UI: Carregamento Inicial (Evita o flash de vitrine vazia)
  if (standalone && isSyncing && buckets.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-fuchsia-100 border-t-fuchsia-500 rounded-full animate-spin"></div>
          <StoreIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-fuchsia-500" size={32} />
        </div>
        <div className="text-center">
          <p className="text-fuchsia-600 font-black uppercase tracking-[0.2em] text-xs">Acessando Lorenza Cloud</p>
          <p className="text-gray-400 text-[10px] mt-2 font-bold italic">Sincronizando estoque da {selectedStore}...</p>
        </div>
      </div>
    );
  }

  // MODO STANDALONE (LINK DIRETO DA LOJA)
  if (standalone) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] p-4 md:p-10 animate-in fade-in duration-700">
        <div className="max-w-5xl mx-auto space-y-8">
          <header className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-fuchsia-50 shadow-sm sticky top-6 z-40">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 magenta-gradient rounded-3xl flex items-center justify-center text-white shadow-lg shadow-fuchsia-100">
                <StoreIcon size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">{selectedStore}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                   <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
                   <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                     {isSyncing ? 'Conectando...' : 'Estoque Sincronizado'}
                   </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isClosingExpedient && (
                <button 
                  onClick={handleRevert}
                  className="p-4 text-amber-500 bg-amber-50 rounded-2xl hover:bg-amber-100 transition-all flex items-center gap-2 font-bold text-xs uppercase"
                >
                  <RotateCcw size={20} /> <span className="hidden sm:inline">Descartar</span>
                </button>
              )}
              <Link to="/" className="p-4 text-gray-300 hover:text-fuchsia-500 bg-gray-50 rounded-2xl transition-all">
                <LogOut size={22} />
              </Link>
            </div>
          </header>

          <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
             <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={24} />
             <div className="flex-1">
               <p className="text-[11px] font-black text-amber-700 uppercase tracking-wide">PDV: Inventário Ativo</p>
               <p className="text-[10px] text-amber-600/80 mt-1 font-bold">
                 Atualize o peso dos baldes abertos. Se um balde acabou, clique em "Acabou" para removê-lo da vitrine.
               </p>
             </div>
          </div>

          <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardList size={16} /> Vitrine da Loja
              </h3>
              {isClosingExpedient && (
                <button 
                  onClick={handleSendInventory}
                  className="magenta-gradient text-white px-10 py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-2xl shadow-fuchsia-200 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all animate-in slide-in-from-right-10"
                >
                  <Send size={20} /> Enviar Atualizações
                </button>
              )}
            </div>

            {localBuckets.length === 0 ? (
              <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-dashed border-fuchsia-200 flex flex-col items-center animate-in fade-in duration-1000">
                <div className="w-24 h-24 bg-fuchsia-50 rounded-full flex items-center justify-center mb-6">
                  <Package size={40} className="text-fuchsia-200" />
                </div>
                <h2 className="text-xl font-black text-gray-800">Vitrine Vazia</h2>
                <p className="text-gray-400 font-bold mt-2 max-w-xs mx-auto text-sm">
                  Não foram encontrados baldes ativos para a {selectedStore}. Verifique a distribuição na Fábrica.
                </p>
                {!isSyncing && (
                  <button onClick={() => window.location.reload()} className="mt-6 text-fuchsia-500 font-bold text-xs uppercase flex items-center gap-2">
                    <RefreshCw size={14} /> Recarregar
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localBuckets.map(b => {
                  const flavor = flavors.find(f => f.id === b.flavorId);
                  return (
                    <div key={b.id} className="bg-white p-7 rounded-[40px] border border-fuchsia-50 shadow-sm hover:border-fuchsia-200 hover:shadow-2xl transition-all group animate-in fade-in slide-in-from-bottom-6">
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex-1">
                          <h4 className="font-black text-gray-800 text-2xl leading-tight">{flavor?.name}</h4>
                          <span className="text-[10px] font-mono text-fuchsia-200 mt-2 block tracking-wider">{b.id}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveLocalBucket(b.id)}
                          className="bg-rose-50 text-rose-500 p-4 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm flex flex-col items-center gap-1.5"
                        >
                          <Trash2 size={24} />
                          <span className="text-[9px] font-black uppercase">Acabou</span>
                        </button>
                      </div>

                      <div className="bg-fuchsia-50/40 p-7 rounded-[24px] flex items-center justify-between border border-fuchsia-100/50 group-hover:bg-white transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Peso Restante (g)</span>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number" 
                              value={b.grams === 0 ? '' : b.grams}
                              placeholder="0"
                              onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                              className="bg-transparent text-4xl font-black text-fuchsia-600 outline-none w-32 placeholder:text-fuchsia-200"
                            />
                            <span className="text-lg font-black text-gray-400">g</span>
                          </div>
                        </div>
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-fuchsia-50">
                           <Edit2 size={24} className="text-fuchsia-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="bg-fuchsia-50/20 border border-fuchsia-100 p-8 rounded-[32px] flex items-center gap-5 text-center justify-center">
             <Info className="text-fuchsia-400" size={24} />
             <p className="text-xs font-black text-fuchsia-400 uppercase tracking-widest">
                Inventário total monitorado: {(localBuckets.reduce((acc, b) => acc + b.grams, 0) / 1000).toFixed(1)}kg
             </p>
          </div>
        </div>
      </div>
    );
  }

  // MODO ADMINISTRADOR (VISÃO GLOBAL)
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
          <ClipboardList size={16} /> Inventário Global
        </button>
        <button 
          onClick={() => setActiveTab('lojas')}
          className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'lojas' ? 'border-b-2 border-fuchsia-500 text-fuchsia-600' : 'text-gray-400'}`}
        >
          <StoreIcon size={16} /> Controle Lojas
        </button>
      </div>

      {activeTab === 'geral' ? (
        <>
          <div className="bg-white p-4 md:p-6 rounded-3xl border border-fuchsia-50 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-200" size={18} />
              <input 
                type="text"
                placeholder="Buscar gelato..."
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
                    <th className="px-6 py-4 text-[10px] font-black text-fuchsia-400 uppercase">Unidade</th>
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
              <button 
                onClick={handleRevert}
                disabled={!isClosingExpedient}
                className="flex items-center gap-2 text-xs font-bold text-amber-500 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-100 transition-all disabled:opacity-30"
              >
                <RotateCcw size={14} /> Reverter
              </button>

              <Link 
                to={`/loja/${encodeURIComponent(selectedStore)}`}
                target="_blank"
                className="flex items-center gap-2 text-xs font-black text-fuchsia-400 hover:text-fuchsia-600 bg-fuchsia-50 px-4 py-2.5 rounded-xl border border-fuchsia-100 transition-all"
              >
                Abrir PDV {selectedStore} <ChevronRight size={14} />
              </Link>

              {isClosingExpedient && (
                <button 
                  onClick={handleSendInventory}
                  className="magenta-gradient text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-fuchsia-100"
                >
                  Salvar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {localBuckets.length === 0 ? (
               <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-fuchsia-100 text-gray-300 font-bold italic text-sm">
                  Sem estoque em vitrine na {selectedStore}.
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
                       <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Peso (g)</span>
                       <input 
                        type="number" 
                        value={b.grams}
                        onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                        className="bg-transparent text-xl font-black text-fuchsia-600 outline-none w-24"
                       />
                     </div>
                     <Edit2 size={14} className="text-fuchsia-200" />
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
