import React, { useState, useMemo } from 'react';
import { useInventory } from '../store/InventoryContext';
import { Truck, Package, CheckCircle2, Store, Search, Filter } from 'lucide-react';

const DistributionForm: React.FC = () => {
  const { buckets, flavors, distributeBuckets } = useInventory();
  const [targetStore, setTargetStore] = useState<'Campo Duna' | 'Casa Kimo' | 'Rosa'>('Campo Duna');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lista de sabores ativos com contagem de estoque na Fábrica
  const flavorStockList = useMemo(() => {
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
      // Filtro de busca inteligente
      .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
      // ORDENAÇÃO: Do que tem MAIS estoque para o que tem menos
      .sort((a, b) => b.stockCount - a.stockCount || a.name.localeCompare(b.name));
  }, [flavors, buckets, searchTerm]);

  const [selectedFlavorId, setSelectedFlavorId] = useState<string | null>(null);
  const [selectedBucketIds, setSelectedBucketIds] = useState<string[]>([]);

  const activeFlavor = useMemo(() => 
    flavorStockList.find(f => f.id === (selectedFlavorId || (flavorStockList.length > 0 ? flavorStockList[0].id : null)))
  , [selectedFlavorId, flavorStockList]);

  // Se o sabor selecionado sumiu do filtro, reseta
  if (selectedFlavorId && !flavorStockList.find(f => f.id === selectedFlavorId)) {
    setSelectedFlavorId(null);
  }

  const currentFlavorId = selectedFlavorId || activeFlavor?.id;

  const availableBuckets = useMemo(() => 
    buckets.filter(b => b.location === 'Fábrica' && b.flavorId === currentFlavorId && b.status === 'estoque')
  , [buckets, currentFlavorId]);

  const toggleBucket = (id: string) => {
    setSelectedBucketIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSend = () => {
    if (selectedBucketIds.length === 0) return;
    distributeBuckets({ targetStore, bucketIds: selectedBucketIds });
    setSelectedBucketIds([]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-fuchsia-50 shadow-sm">
        <div className="flex flex-col md:flex-row gap-8 min-h-[500px]">
          
          {/* Coluna de Busca e Lista de Sabores */}
          <div className="md:w-1/2 flex flex-col">
            <div className="mb-6 space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">1. Escolha o Sabor</h4>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fuchsia-300" />
                <input 
                  type="text"
                  placeholder="Pesquisar sabor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-fuchsia-50/50 border-none rounded-2xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-fuchsia-100 outline-none font-bold text-gray-700"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-1.5">
              {flavorStockList.length === 0 ? (
                <div className="p-10 text-center text-gray-300 italic text-xs">Nenhum sabor encontrado.</div>
              ) : (
                flavorStockList.map(f => (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFlavorId(f.id); setSelectedBucketIds([]); }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl text-left transition-all border ${
                      currentFlavorId === f.id 
                        ? 'bg-fuchsia-50 border-fuchsia-200 shadow-sm' 
                        : 'bg-white border-transparent hover:bg-fuchsia-50/30'
                    }`}
                  >
                    <div>
                      <p className={`text-sm font-bold ${currentFlavorId === f.id ? 'text-fuchsia-700' : 'text-gray-700'}`}>{f.name}</p>
                      <p className={`text-[10px] font-bold uppercase mt-0.5 ${f.stockCount > 0 ? 'text-fuchsia-300' : 'text-gray-300'}`}>
                        {f.stockCount} baldes em estoque
                      </p>
                    </div>
                    {f.stockCount > 0 && (
                      <div className="px-2 py-1 bg-fuchsia-100/50 text-fuchsia-600 text-[10px] font-black rounded-lg">
                        {(f.totalWeight/1000).toFixed(1)}kg
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Coluna de Seleção de Unidade e Baldes */}
          <div className="md:w-1/2 bg-fuchsia-50/10 rounded-3xl border border-fuchsia-50 p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Unidade de Destino</h4>
               <div className="flex gap-1 p-1 bg-white rounded-xl border border-fuchsia-100">
                  {(['Campo Duna', 'Casa Kimo', 'Rosa'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setTargetStore(s)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        targetStore === s ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-100' : 'text-gray-400 hover:text-fuchsia-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6">
              {availableBuckets.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 p-8 text-center">
                  <Package size={40} className="mb-4 opacity-20" />
                  <p className="text-sm font-bold">Sem baldes disponíveis</p>
                  <p className="text-xs">Produza este sabor para poder distribuir.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableBuckets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => toggleBucket(b.id)}
                      className={`p-4 rounded-2xl border-2 text-left relative transition-all group ${
                        selectedBucketIds.includes(b.id) 
                          ? 'border-fuchsia-400 bg-fuchsia-50' 
                          : 'border-white bg-white hover:border-fuchsia-100 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Peso</span>
                        <span className="text-lg font-black text-gray-700">{b.grams}g</span>
                        <span className="text-[9px] font-mono text-fuchsia-300 mt-2 truncate">{b.id}</span>
                      </div>
                      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all border ${
                        selectedBucketIds.includes(b.id) ? 'bg-fuchsia-500 border-fuchsia-500 text-white' : 'bg-transparent border-gray-100'
                      }`}>
                        {selectedBucketIds.includes(b.id) && <CheckCircle2 size={12} />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-fuchsia-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Selecionados</p>
                <p className="text-xl font-black text-fuchsia-600">{selectedBucketIds.length} <span className="text-sm font-normal text-gray-400">baldes</span></p>
              </div>
              <button
                onClick={handleSend}
                disabled={selectedBucketIds.length === 0}
                className="bg-sky-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-sky-100 flex items-center gap-2 hover:bg-sky-600 active:scale-95 disabled:opacity-30 transition-all"
              >
                <Truck size={18} />
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributionForm;