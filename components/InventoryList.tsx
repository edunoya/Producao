
import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useInventory } from '../store/InventoryContext';
import { STORES } from '../constants';
import { 
  Search, MapPin, Store as StoreIcon, RefreshCw, Send, CheckCircle2, AlertCircle, Scale, User, Lock
} from 'lucide-react';
import { Bucket, StoreName } from '../types';

interface InventoryListProps {
  standalone?: boolean;
}

const InventoryList: React.FC<InventoryListProps> = ({ standalone }) => {
  const params = useParams<{ storeName: string }>();
  const { buckets, flavors, saveStoreClosing, isSyncing, isInitialLoad } = useInventory();
  
  const [employee, setEmployee] = useState('');
  const [localBuckets, setLocalBuckets] = useState<Bucket[]>([]);
  const [showFinishedScreen, setShowFinishedScreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedStore = useMemo(() => {
    const decoded = decodeURIComponent(params.storeName || '').trim();
    return STORES.find(s => s === decoded) as StoreName || STORES[0] as StoreName;
  }, [params.storeName]);

  useEffect(() => {
    if (!isInitialLoad) {
      const storeBuckets = buckets.filter(b => b.location === selectedStore && b.status === 'estoque');
      setLocalBuckets(JSON.parse(JSON.stringify(storeBuckets)));
    }
  }, [selectedStore, buckets, isInitialLoad]);

  const handleUpdateWeight = (id: string, grams: number) => {
    setLocalBuckets(prev => prev.map(b => b.id === id ? { ...b, grams: Math.max(0, grams) } : b));
  };

  const handleFinalize = async () => {
    if (!employee.trim()) {
      setErrorMessage("Por favor, informe seu nome para registrar.");
      return;
    }
    try {
      await saveStoreClosing(selectedStore, employee, localBuckets);
      setShowFinishedScreen(true);
    } catch (e) { setErrorMessage("Erro na sincronização."); }
  };

  if (showFinishedScreen) {
    return (
      <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-6 text-center animate-in zoom-in">
        <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-fuchsia-50 max-w-sm">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-gray-800">Estoque Enviado!</h1>
          <p className="text-gray-400 mt-2">Obrigado, {employee}.<br/>Relatório salvo na fábrica.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] p-6 animate-in fade-in pb-32">
      <div className="max-w-xl mx-auto space-y-8">
        <header className="flex justify-between items-center bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm sticky top-4 z-40">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 magenta-gradient rounded-2xl flex items-center justify-center text-white shadow-lg">
               <StoreIcon size={24} />
             </div>
             <div>
               <h1 className="text-xl font-black text-gray-800">{selectedStore}</h1>
               <p className="text-[8px] font-black text-fuchsia-400 uppercase tracking-widest">Painel de Unidade</p>
             </div>
           </div>
           <RefreshCw size={20} className={isSyncing ? 'animate-spin text-amber-500' : 'text-green-500'} />
        </header>

        <div className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm space-y-4">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
            <User size={12} /> Funcionário Responsável
          </label>
          <input 
            type="text" 
            placeholder="Seu nome completo..." 
            className="w-full bg-fuchsia-50/30 rounded-2xl px-6 py-4 text-sm font-bold outline-none border border-transparent focus:border-fuchsia-100 transition-all"
            value={employee}
            onChange={e => setEmployee(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Conferência de Estoque Ativo</h3>
          {localBuckets.map(b => (
            <div key={b.id} className="bg-white p-6 rounded-[32px] border border-fuchsia-50 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-black text-gray-800 text-sm">{flavors.find(f => f.id === b.flavorId)?.name}</h4>
                <span className="text-[9px] font-mono text-gray-300">{b.id}</span>
              </div>
              <div className="flex items-center gap-4 bg-fuchsia-50/30 p-4 rounded-2xl">
                <Scale size={20} className="text-fuchsia-200" />
                <input 
                  type="number" 
                  value={b.grams || ''}
                  onChange={e => handleUpdateWeight(b.id, Number(e.target.value))}
                  className="bg-transparent text-2xl font-black text-fuchsia-600 outline-none w-full text-center"
                />
                <span className="text-xs font-black text-fuchsia-200">{b.unitType === 'Balde' ? 'g' : 'un'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-8 left-0 right-0 px-6 max-w-xl mx-auto">
          <button 
            onClick={handleFinalize} 
            disabled={isSyncing}
            className="w-full magenta-gradient text-white py-6 rounded-[32px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
          >
            <Send size={24} /> Enviar Conferência
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;
