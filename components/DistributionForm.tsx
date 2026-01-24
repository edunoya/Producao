
import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, Package, CheckCircle2, Store, Search, Filter, ShoppingBag, ArrowRight, X } from 'lucide-react';
import { Bucket } from '../types';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, categories, distributeBuckets } = useInventory();
  const [targetStore, setTargetStore] = useState<'Campo Duna' | 'Casa Kimo' | 'Rosa'>('Campo Duna');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  
  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);

  // Lista de sabores filtrada
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
    if (selectedBucketIds.length === 0) return;
    distributeBuckets({ targetStore, bucketIds: selectedBucketIds });
    setSelectedBucketIds([]);
    setSelectedFlavorId(null);
  };

  const getSelectedBucketsInfo = () => {
    return selectedBucketIds.map(id => buckets.find(b => b.id === id)).filter(Boolean) as Bucket[];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Lado Esquerdo: Seleção de Sabores */}
        <div className="flex-1 bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">Distribuição</h2>
              <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">1. Selecione os Gelatos da Fábrica</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setSelectedCategoryId('all')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategoryId === 'all' ? 'bg-fuchsia-500 text-white shadow-lg' : 'bg-fuchsia-50 text-fuchsia-400 hover:bg-fuchsia-100'}`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategoryId === cat.id ? 'bg-fuchsia-500 text-white shadow-lg' : 'bg-fuchsia-50 text-fuchsia-400 hover:bg-fuchsia-100'}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200" />
            <input 
              type="text"
              placeholder="Pesquisar por nome ou sigla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-fuchsia-50/30 border-none rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-fuchsia-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {flavorList.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFlavorId(f.id === selectedFlavorId ? null : f.id)}
                className={`group p-5 rounded-3xl border-2 transition-all text-left relative overflow-hidden ${
                  selectedFlavorId === f.id 
                    ? 'border-fuchsia-500 bg-fuchsia-50/50 shadow-xl shadow-fuchsia-100' 
                    : 'border-transparent bg-white hover:border-fuchsia-200 hover:shadow-lg'
                }`}
              >
                <div className="relative z-10">
                  <span className="text-[9px] font-black text-fuchsia-300 uppercase tracking-[0.2em]">{f.initials}</span>
                  <h4 className="text-lg font-black text-gray-800 leading-tight mt-1">{f.name}</h4>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="bg-white/80 px-2 py-1 rounded-lg border border-fuchsia-50 flex items-center gap-1.5">
                      <Package size={12} className="text-fuchsia-400" />
                      <span className="text-xs font-black text-gray-700">{f.stockCount} baldes</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Package size={100} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Lado Direito: Seleção de Baldes e Envio */}
        <div className="lg:w-[400px] space-y-6">
          <div className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Store size={18} className="text-fuchsia-400" />
              Destino
            </h3>
            
            <div className="grid grid-cols-1 gap-2">
              {(['Campo Duna', 'Casa Kimo', 'Rosa'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setTargetStore(s)}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    targetStore === s 
                      ? 'border-fuchsia-500 bg-fuchsia-500 text-white shadow-lg' 
                      : 'border-fuchsia-50 bg-white text-gray-400 hover:border-fuchsia-200'
                  }`}
                >
                  <span className="text-sm font-black uppercase tracking-widest">{s}</span>
                  {targetStore === s && <CheckCircle2 size={20} />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-fuchsia-50 shadow-sm flex-1 min-h-[400px] flex flex-col">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-fuchsia-400" />
                Baldes Selecionados
              </div>
              <span className="bg-fuchsia-100 text-fuchsia-600 px-2.5 py-1 rounded-full text-[10px]">{selectedBucketIds.length}</span>
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {selectedFlavorId ? (
                <div className="animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="w-1 h-4 bg-fuchsia-500 rounded-full"></div>
                     <span className="text-[10px] font-black text-gray-700 uppercase">Baldes de {flavors.find(f => f.id === selectedFlavorId)?.name}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {availableBuckets.map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleToggleBucket(b.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          selectedBucketIds.includes(b.id)
                            ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700'
                            : 'border-fuchsia-50 bg-fuchsia-50/20 text-gray-400 hover:border-fuchsia-100'
                        }`}
                      >
                        <div className="text-left">
                          <p className="text-xs font-black">{b.grams}g</p>
                          <p className="text-[9px] font-mono opacity-50">{b.id}</p>
                        </div>
                        {selectedBucketIds.includes(b.id) ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-gray-200" />}
                      </button>
                    ))}
                  </div>
                </div>
              ) : selectedBucketIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
                   <Package size={48} className="opacity-10 mb-4" />
                   <p className="text-sm font-bold">Toque em um sabor</p>
                   <p className="text-xs mt-1">para ver os baldes disponíveis</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getSelectedBucketsInfo().map(b => (
                    <div key={b.id} className="flex items-center justify-between p-4 bg-fuchsia-50 rounded-2xl border border-fuchsia-100">
                      <div>
                        <p className="text-[10px] font-black text-fuchsia-600 uppercase mb-1">{flavors.find(f => f.id === b.flavorId)?.name}</p>
                        <p className="text-xs font-black text-gray-800">{b.grams}g</p>
                      </div>
                      <button onClick={() => handleToggleBucket(b.id)} className="text-rose-400 hover:text-rose-600">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-8 border-t border-fuchsia-50 mt-6">
              <button
                disabled={selectedBucketIds.length === 0}
                onClick={handleDistribute}
                className="w-full magenta-gradient text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-fuchsia-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
              >
                <Truck size={20} />
                Enviar para {targetStore}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;
