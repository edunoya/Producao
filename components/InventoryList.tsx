
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  Search, MapPin, ClipboardList, Store as StoreIcon,
  RefreshCw, Send, ArrowRight, Loader2, Lock, Trash2, CheckCircle2, AlertCircle, Scale
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  const { buckets, flavors, saveStoreClosing, markAsSold, isSyncing, isInitialLoad } = useInventory();
  
  const [activeTab, setActiveTab] = useState<'geral' | 'lojas'> (standalone ? 'lojas' : 'geral');
  const [filterStore, setFilterStore] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedStore = useMemo(() => {
    if (!params.storeName) return 'Campo Duna' as StoreName;
    const decoded = decodeURIComponent(params.storeName).trim();
    return STORES.find(s => s === decoded) as StoreName || 'Campo Duna' as StoreName;
  }, [params.storeName]);

  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);

  // Inicializa o estoque local quando o banco de dados é carregado ou quando muda de loja
  useEffect(() => {
    if (!isInitialLoad && !isSyncing) {
      // Importante: Manter apenas baldes em ESTOQUE na localidade selecionada
      const storeBuckets = buckets.filter(b => b.location === selectedStore && b.status === 'estoque');
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
    }
  }, [selectedStore, buckets, isInitialLoad, isSyncing]);

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
    setHasChanges(true);
  };

  const handleAcabou = async (id: string) => {
    if (window.confirm("Confirmar que o gelato acabou e remover da vitrine?")) {
      // Se estiver em modo standalone, removemos localmente e marcamos flag para enviar no fim
      if (standalone) {
        setLocalBuckets(prev => prev.filter(b => b.id !== id));
        setHasChanges(true);
      } else {
        // Se for admin, removemos direto do banco
        await markAsSold(id);
      }
    }
  };

  const handleFinalizeExpedient = async (e: React.MouseEvent) => {
    if (isSyncing) return;
    const totalGrams = localBuckets.reduce((acc, b) => acc + b.grams, 0);
    if (window.confirm(`Deseja salvar o fechamento com ${(totalGrams/1000).toFixed(1)}kg restantes?`)) {
      try {
        await saveStoreClosing(selectedStore, localBuckets);
        setHasChanges(false);
        if (standalone) setShowFinishedScreen(true);
      } catch (e) {
        alert("Erro ao salvar fechamento. Tente novamente.");
      }
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
            <p className="text-gray-400 font-bold mt-3 leading-relaxed">O estoque de hoje foi processado e enviado para a fábrica.</p>
          </div>
          <div className="pt-4 flex flex-col items-center gap-2">
            <Lock size={18} className="text-fuchsia-300" />
            <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest">Acesso Restrito - Lorenza Cloud</p>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialLoad) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex flex-col items-center justify-center gap-8 animate-in fade-in">
        <Loader2 className="w-20 h-20 text-fuchsia-500 animate-spin stroke-[1]" />
        <p className="text-fuchsia-600 font-black uppercase tracking-[0.4em] text-[10px]">Carregando Estoque...</p>
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
              <div>
                <h1 className="text-2xl font-black text-gray-800 tracking-tight">{selectedStore}</h1>
                <span className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest">Vitrine Ativa</span>
              </div>
            </div>
            <div className={`p-4 rounded-full transition-all ${isSyncing ? 'bg-amber-50 text-amber-500' : 'bg-green-50 text-green-500'}`}>
               <RefreshCw size={24} className={isSyncing ? 'animate-spin' : ''} />
            </div>
          </header>

          <div className="space-y-6">
             <div className="flex justify-between items-center px-4">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <ClipboardList size={16} /> Baldes em Exposição
               </h3>
               {localBuckets.length > 0 && (
                 <p className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">Auditando {localBuckets.length} itens</p>
               )}
             </div>

             {localBuckets.length === 0 ? (
               <div className="bg-white p-12 rounded-[40px] text-center border-2 border-dashed border-fuchsia-50">
                  <AlertCircle size={48} className="mx-auto text-fuchsia-100 mb-4" />
                  <p className="text-gray-400 font-bold">Nenhum balde no estoque desta unidade.</p>
                  <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest mt-2">Aguardando envio da fábrica</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {localBuckets.map(b => (
                    <div key={b.id} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm group hover:border-fuchsia-200 transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex-1 pr-4">
                          <h4 className="font-black text-gray-800 text-lg leading-tight truncate">{flavors.find(fl => fl.id === b.flavorId)?.name}</h4>
                          <span className="text-[9px] font-mono text-fuchsia-300 block mt-1">{b.id}</span>
                        </div>
                        <button 
                          onClick={() => handleAcabou(b.id)} 
                          className="bg-rose-50 text-rose-500 px-4 py-2 rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Acabou
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-fuchsia-50/30 p-4 rounded-2xl border border-fuchsia-50">
                        {/* Fix: Use Scale icon after adding it to the imports above */}
                        <Scale size={20} className="text-fuchsia-200" />
                        <div className="flex-1 flex items-end">
                          <input 
                            type="number" 
                            value={b.grams}
                            onChange={(e) => handleUpdateLocalWeight(b.id, Number(e.target.value))}
                            className="bg-transparent text-3xl font-black text-fuchsia-600 outline-none w-full text-center"
                          />
                          <span className="text-sm font-black text-fuchsia-200 mb-1">g</span>
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
             )}
          </div>
          
          {/* Botão de Fechamento Flutuante */}
          {hasChanges && localBuckets.length > 0 && (
            <div className="fixed bottom-8 left-0 right-0 px-6 z-50 animate-in slide-in-from-bottom-10">
              <button 
                onClick={handleFinalizeExpedient} 
                disabled={isSyncing}
                className="w-full max-w-md mx-auto magenta-gradient text-white py-6 rounded-[32px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all"
              >
                {isSyncing ? <RefreshCw className="animate-spin" /> : <Send size={24} />}
                {isSyncing ? 'Sincronizando...' : 'Finalizar Expediente'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Visualização Admin
  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex gap-8 border-b border-fuchsia-50 mb-10 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveTab('geral')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] relative whitespace-nowrap transition-colors ${activeTab === 'geral' ? 'text-fuchsia-600' : 'text-gray-400 hover:text-fuchsia-300'}`}>
          Estoque Geral
          {activeTab === 'geral' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full"></div>}
        </button>
        <button onClick={() => setActiveTab('lojas')} className={`pb-6 px-4 text-xs font-black uppercase tracking-[0.2em] relative whitespace-nowrap transition-colors ${activeTab === 'lojas' ? 'text-fuchsia-600' : 'text-gray-400 hover:text-fuchsia-300'}`}>
          Monitorar Unidades
          {activeTab === 'lojas' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-fuchsia-500 rounded-full"></div>}
        </button>
      </div>

      {activeTab === 'geral' ? (
        <div className="bg-white rounded-[40px] border border-fuchsia-50 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
           <div className="p-6 border-b border-fuchsia-50 bg-fuchsia-50/10">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Pesquisar por sabor ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white rounded-2xl px-12 py-4 text-sm font-bold outline-none border border-fuchsia-50 focus:border-fuchsia-200 transition-all shadow-inner"
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-fuchsia-50/20 text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">
                    <th className="px-10 py-6">Gelato</th>
                    <th className="px-10 py-6 text-right">Massa</th>
                    <th className="px-10 py-6">Localização</th>
                    <th className="px-10 py-6 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fuchsia-50/30">
                  {filteredBuckets.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-gray-300 font-bold italic">Nenhum estoque disponível.</td></tr>
                  ) : (
                    filteredBuckets.map(b => (
                      <tr key={b.id} className="hover:bg-fuchsia-50/10 transition-colors group">
                        <td className="px-10 py-6">
                           <p className="font-black text-gray-800 text-sm">{flavors.find(f => f.id === b.flavorId)?.name}</p>
                           <span className="text-[9px] font-mono text-gray-300">{b.id}</span>
                        </td>
                        <td className="px-10 py-6 text-right font-black text-fuchsia-600">{b.grams}g</td>
                        <td className="px-10 py-6">
                          <span className="text-[9px] font-black px-3 py-1 bg-fuchsia-50 rounded-lg text-fuchsia-500 border border-fuchsia-100 uppercase tracking-widest">
                            {b.location}
                          </span>
                        </td>
                        <td className="px-10 py-6 text-center">
                           <button onClick={() => handleAcabou(b.id)} className="p-3 text-rose-200 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                             <Trash2 size={18} />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {STORES.map(s => (
             <Link key={s} to={`/loja/${encodeURIComponent(s)}`} className="bg-white p-10 rounded-[50px] border border-fuchsia-50 shadow-sm hover:shadow-xl hover:border-fuchsia-200 transition-all flex flex-col items-center gap-6 group">
                <div className="w-20 h-20 bg-fuchsia-50 rounded-3xl flex items-center justify-center text-fuchsia-500 shadow-inner group-hover:magenta-gradient group-hover:text-white transition-all">
                  <StoreIcon size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">{s}</h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-fuchsia-400 uppercase tracking-widest bg-fuchsia-50 px-5 py-2.5 rounded-xl group-hover:bg-fuchsia-100 transition-colors">
                  Abrir Audit <ArrowRight size={14} />
                </div>
             </Link>
           ))}
        </div>
      )}
    </div>
  );
};

export default InventoryList;
