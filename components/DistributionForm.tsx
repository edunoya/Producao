
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, Package, CheckCircle2, Store, Search, ShoppingBag, ArrowRight, X, ChevronRight } from 'lucide-react';
import { Bucket } from '../types';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, categories, distributeBuckets, isSyncing } = useInventory();
  const [targetStore, setTargetStore] = useState<'Campo Duna' | 'Casa Kimo' | 'Rosa'>('Campo Duna');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);

  const flavorList = useMemo(() => {
    return flavors
      .filter(f => f.isActive)
      .map(f => {
        const stockBuckets = buckets.filter(b => b.flavorId === f.id && b.location === 'Fábrica' && b.status === 'estoque');
        return {
          ...f,
          stockCount: stockBuckets.length,
          totalWeight: stockBuckets.reduce((acc, b) => acc + b.grams, 0)
        };
      })
      .filter(f => f.stockCount > 0)
      .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.initials.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(f => selectedCategoryId === 'all' || f.categoryIds.includes(selectedCategoryId))
      .sort((a, b) => b.stockCount - a.stockCount);
  }, [flavors, buckets, searchTerm, selectedCategoryId]);

  const availableBuckets = useMemo(() => 
    buckets.filter(b => b.location === 'Fábrica' && b.flavorId === selectedFlavorId && b.status === 'estoque')
  , [buckets, selectedFlavorId]);

  const handleToggleBucket = (id: string) => {
    setSelectedBucketIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDistribute = () => {
    if (selectedBucketIds.length === 0 || isSyncing) return;
    distributeBuckets({ targetStore, bucketIds: selectedBucketIds });
    setSelectedBucketIds([]);
    setSelectedFlavorId(null);
  };

  const selectedItems = useMemo(() => 
    selectedBucketIds.map(id => buckets.find(b => b.id === id)).filter(Boolean) as Bucket[]
  , [selectedBucketIds, buckets]);

  const totalGramsToShip = selectedItems.reduce((acc, b) => acc + b.grams, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Lado Esquerdo: Navegação de Sabores */}
        <div className="flex-1 bg-white p-6 md:p-10 rounded-[40px] border border-fuchsia-50 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-800 tracking-tight">Logística Lorenza</h2>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Estoque Disponível na Fábrica</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSelectedCategoryId('all')}
                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategoryId === 'all' ? 'bg-fuchsia-500 text-white shadow-xl shadow-fuchsia-100' : 'bg-fuchsia-50 text-fuchsia-400 hover:bg-fuchsia-100'}`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategoryId === cat.id ? 'bg-fuchsia-500 text-white shadow-xl shadow-fuchsia-100' : 'bg-fuchsia-50 text-fuchsia-400 hover:bg-fuchsia-100'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative group">
            <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-fuchsia-200 group-focus-within:text-fuchsia-400 transition-colors" />
            <input 
              type="text"
              placeholder="Localizar gelato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-fuchsia-50/30 border-2 border-transparent focus:border-fuchsia-100 rounded-3xl pl-14 pr-6 py-5 text-sm font-bold text-gray-700 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
            {flavorList.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFlavorId(f.id === selectedFlavorId ? null : f.id)}
                className={`group p-6 rounded-[32px] border-2 transition-all text-left relative overflow-hidden ${
                  selectedFlavorId === f.id 
                    ? 'border-fuchsia-500 bg-fuchsia-50/50 shadow-2xl shadow-fuchsia-100' 
                    : 'border-transparent bg-white hover:border-fuchsia-200 hover:shadow-xl'
                }`}
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <span className="text-[10px] font-black text-fuchsia-300 uppercase tracking-[0.2em]">{f.initials}</span>
                    <h4 className="text-xl font-black text-gray-800 leading-tight mt-1">{f.name}</h4>
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <div className="bg-white/90 px-3 py-1.5 rounded-xl border border-fuchsia-50 flex items-center gap-2 shadow-sm">
                      <Package size={14} className="text-fuchsia-400" />
                      <span className="text-xs font-black text-gray-700">{f.stockCount}un</span>
                    </div>
                    <div className="bg-fuchsia-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-10 transition-opacity rotate-12">
                   <Truck size={120} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lado Direito: Carrinho de Envio */}
        <div className="lg:w-[420px] space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Store size={18} className="text-fuchsia-400" />
              Unidade Destino
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {(['Campo Duna', 'Casa Kimo', 'Rosa'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setTargetStore(s)}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all font-black text-sm uppercase tracking-widest ${
                    targetStore === s 
                      ? 'border-fuchsia-500 bg-fuchsia-500 text-white shadow-xl shadow-fuchsia-100' 
                      : 'border-fuchsia-50 bg-white text-gray-400 hover:border-fuchsia-200'
                  }`}
                >
                  {s}
                  {targetStore === s && <CheckCircle2 size={20} />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShoppingBag size={18} className="text-fuchsia-400" />
                Carga de Envio
              </h3>
              <span className="bg-fuchsia-100 text-fuchsia-600 px-3 py-1 rounded-full text-[10px] font-black">{selectedBucketIds.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {selectedFlavorId ? (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-2xl">
                     <div className="w-1.5 h-6 bg-fuchsia-500 rounded-full"></div>
                     <span className="text-xs font-black text-gray-700 uppercase">{flavors.find(f => f.id === selectedFlavorId)?.name}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {availableBuckets.map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleToggleBucket(b.id)}
                        className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                          selectedBucketIds.includes(b.id)
                            ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700'
                            : 'border-fuchsia-50 bg-white text-gray-400 hover:border-fuchsia-100'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-sm font-black">{b.grams}g</p>
                          <p className="text-[9px] font-mono opacity-50 uppercase tracking-tighter">{b.id}</p>
                        </div>
                        {selectedBucketIds.includes(b.id) ? <CheckCircle2 size={18} className="text-fuchsia-500" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-100" />}
                      </button>
                    ))}
                  </div>
                </div>
              ) : selectedBucketIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-300 opacity-60 py-10">
                   <Package size={64} className="mb-6 stroke-[1.5]" />
                   <p className="text-sm font-bold">Toque em um gelato</p>
                   <p className="text-[10px] uppercase tracking-widest mt-1">para escolher os baldes</p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in zoom-in-95">
                  {selectedItems.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-5 bg-fuchsia-50/50 rounded-2xl border border-fuchsia-100 group">
                      <div>
                        <p className="text-[9px] font-black text-fuchsia-600 uppercase mb-1">{flavors.find(f => f.id === b.flavorId)?.name}</p>
                        <p className="text-sm font-black text-gray-800">{b.grams}g</p>
                      </div>
                      <button onClick={() => handleToggleBucket(b.id)} className="text-rose-300 hover:text-rose-500 transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-fuchsia-50 mt-8 space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Peso Total da Carga</span>
                <span className="text-2xl font-black text-fuchsia-600">{(totalGramsToShip/1000).toFixed(1)}kg</span>
              </div>
              <button
                disabled={selectedBucketIds.length === 0 || isSyncing}
                onClick={handleDistribute}
                className="w-full magenta-gradient text-white py-6 rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-fuchsia-200 flex items-center justify-center gap-3 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:hover:scale-100"
              >
                {isSyncing ? 'Sincronizando...' : (
                  <>
                    <Truck size={20} />
                    Enviar para {targetStore.split(' ')[0]}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;
